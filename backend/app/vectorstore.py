import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
)
from app.database import QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION
from app.embeddings import embed_texts, embed_query

logger = logging.getLogger("datum.vectorstore")

_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """Initialize or return the singleton QdrantClient."""
    global _client
    if _client is None:
        if not QDRANT_URL:
            raise RuntimeError(
                "QDRANT_URL is not configured. Please set QDRANT_URL in your .env file."
            )
        if QDRANT_URL == ":memory:":
            logger.info("Initializing in-memory Qdrant client (:memory:)...")
            _client = QdrantClient(location=":memory:")
        else:
            logger.info(f"Connecting to Qdrant cluster at '{QDRANT_URL}'...")
            _client = QdrantClient(
                url=QDRANT_URL,
                api_key=QDRANT_API_KEY if QDRANT_API_KEY else None,
                timeout=60.0,
            )
    return _client


def ensure_payload_indexes(client: QdrantClient) -> None:
    """
    Ensure required payload indexes (specifically 'document_id' keyword index) exist
    for document-level isolation and filtered vector retrieval.
    """
    try:
        collection_info = client.get_collection(QDRANT_COLLECTION)
        payload_schema = collection_info.payload_schema or {}

        if "document_id" not in payload_schema:
            logger.info(
                f"Creating payload index for 'document_id' (keyword) in collection '{QDRANT_COLLECTION}'..."
            )
            client.create_payload_index(
                collection_name=QDRANT_COLLECTION,
                field_name="document_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info(
                f"Payload index for 'document_id' created successfully in collection '{QDRANT_COLLECTION}'."
            )
        else:
            logger.info(
                f"Payload index for 'document_id' already exists in collection '{QDRANT_COLLECTION}'."
            )
    except Exception as e:
        err_msg = str(e).lower()
        if "already exists" in err_msg:
            logger.info(
                f"Payload index for 'document_id' already exists in collection '{QDRANT_COLLECTION}'."
            )
        else:
            logger.warning(
                f"Could not verify or create payload index for 'document_id' in '{QDRANT_COLLECTION}': {e}"
            )


def ensure_collection(client: QdrantClient) -> None:
    """Ensure the target collection exists with 384 dimensions and Cosine distance, and payload indexes are created."""
    collections = client.get_collections().collections
    if not any(c.name == QDRANT_COLLECTION for c in collections):
        logger.info(
            f"Creating Qdrant collection '{QDRANT_COLLECTION}' (dim=384, distance=Cosine)..."
        )
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
    ensure_payload_indexes(client)


def init_vectorstore() -> bool:
    """
    Validate connection to Qdrant and ensure the collection exists.
    Logs warnings/errors gracefully if Qdrant is unconfigured or unreachable.
    Returns True if connection succeeded and collection is ready, False otherwise.
    """
    if not QDRANT_URL:
        logger.warning(
            "QDRANT_URL is not configured. Vector search will be unavailable until Qdrant is configured."
        )
        return False

    try:
        client = get_qdrant_client()
        ensure_collection(client)
        logger.info(f"Qdrant connection verified. Collection '{QDRANT_COLLECTION}' is ready.")
        return True
    except Exception as e:
        logger.error(
            f"Failed to connect to Qdrant at '{QDRANT_URL}': {e}. "
            "Document uploads requiring embeddings will fail until resolved."
        )
        return False


def check_vectorstore_health() -> bool:
    """Lightweight check to verify Qdrant connectivity."""
    if not QDRANT_URL:
        return False
    try:
        client = get_qdrant_client()
        client.get_collections()
        return True
    except Exception as e:
        logger.warning(f"Qdrant health check failed: {e}")
        return False


def upsert_chunks(document_id: str, chunks: List[Dict[str, Any]]) -> None:
    """
    Embed chunk texts using embed_texts (in batches of 32) and upsert points into Qdrant.
    Point ID = chunk id (UUID), Vector = embedding, Payload = chunk metadata.
    """
    if not chunks:
        return

    client = get_qdrant_client()
    ensure_collection(client)

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    points = [
        PointStruct(
            id=c["id"],
            vector=emb,
            payload={
                "document_id": document_id,
                "chunk_index": c["chunk_index"],
                "section_title": c.get("section_title"),
                "page_start": c["page_start"],
                "page_end": c["page_end"],
                "text": c["text"],
                "word_count": c["word_count"],
            },
        )
        for c, emb in zip(chunks, embeddings)
    ]

    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(
            collection_name=QDRANT_COLLECTION,
            points=batch,
        )
    logger.info(f"Successfully upserted {len(points)} chunk vectors for document {document_id}.")


def delete_document_vectors(document_id: str) -> None:
    """
    Delete all vector points where payload.document_id matches using filter-based delete.
    """
    if not QDRANT_URL:
        return

    try:
        client = get_qdrant_client()
        client.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
        logger.info(f"Deleted vector points for document {document_id} from Qdrant.")
    except Exception as e:
        logger.warning(f"Could not delete vectors for document {document_id} from Qdrant: {e}")


def search(document_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Dense retrieval search over chunks belonging to document_id:
    - Embeds query with BGE asymmetric instruction prefix
    - Applies Qdrant payload filter for document_id
    - Returns list of matching chunks with similarity score and metadata
    """
    client = get_qdrant_client()
    ensure_collection(client)

    query_vector = embed_query(query)

    query_filter = Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value=document_id),
            )
        ]
    )

    if hasattr(client, "query_points"):
        response = client.query_points(
            collection_name=QDRANT_COLLECTION,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
        )
        scored_points = response.points
    else:
        scored_points = client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=top_k,
        )

    results = []
    for pt in scored_points:
        payload = pt.payload or {}
        results.append(
            {
                "chunk_id": str(pt.id),
                "section_title": payload.get("section_title"),
                "page_start": payload.get("page_start", 1),
                "page_end": payload.get("page_end", 1),
                "text": payload.get("text", ""),
                "score": float(pt.score),
            }
        )

    return results
