import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from app.database import EMBEDDING_MODEL

logger = logging.getLogger("datum.embeddings")

_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """Retrieve or initialize the singleton SentenceTransformer embedding model."""
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully.")
    return _model


def init_embedding_model() -> SentenceTransformer:
    """Preload the embedding model at startup."""
    return get_embedding_model()


def embed_texts(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    Generate dense vector embeddings for a list of document chunk texts.
    Batches texts (default batch size 32) and normalizes vectors for cosine similarity.
    Does NOT prepend a query instruction prefix.
    """
    if not texts:
        return []

    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embeddings.tolist()


def embed_query(text: str) -> List[float]:
    """
    Generate dense vector embedding for a search query.
    Prepends the BGE query instruction prefix for asymmetric passage retrieval:
    'Represent this sentence for searching relevant passages: '
    """
    query_text = f"Represent this sentence for searching relevant passages: {text.strip()}"
    model = get_embedding_model()
    embedding = model.encode(
        query_text,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embedding.tolist()
