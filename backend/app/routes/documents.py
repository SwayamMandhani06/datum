import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.database import get_db, UPLOAD_DIR, MAX_UPLOAD_MB, MAX_UPLOAD_BYTES
from app.models import (
    DocumentResponse,
    DocumentUploadResponse,
    ChunkResponse,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
)
from app.parsing import parse_pdf
from app.chunking import build_chunks_from_blocks
from app.vectorstore import upsert_chunks, delete_document_vectors, search

router = APIRouter(prefix="/documents", tags=["documents"])


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal."""
    p = Path(filename).name
    # Replace special characters that could cause filesystem issues
    cleaned = "".join(c for c in p if c.isalnum() or c in (".", "_", "-")).strip()
    return cleaned if cleaned else "document.pdf"


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF document, validate type/size, extract text,
    perform section-aware chunking, generate embeddings, and persist in SQLite & Qdrant.
    Progresses: processing -> embedding -> ready (or failed).
    """
    # 1. Validate file extension
    original_filename = file.filename or "document.pdf"
    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are supported.",
        )

    doc_id = str(uuid.uuid4())
    safe_name = sanitize_filename(original_filename)
    saved_filename = f"{doc_id}_{safe_name}"
    file_path = UPLOAD_DIR / saved_filename

    # 2. Save file stream to disk enforcing MAX_UPLOAD_BYTES
    bytes_read = 0
    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB buffer
                bytes_read += len(chunk)
                if bytes_read > MAX_UPLOAD_BYTES:
                    f.close()
                    if file_path.exists():
                        file_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_MB}MB.",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    # 3. Create initial document record with status "processing"
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO documents (id, filename, upload_date, page_count, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (doc_id, original_filename, now_iso, 0, "processing", None),
        )
        await db.commit()

    # 4. Parse PDF and generate section-aware chunks
    try:
        page_count, parsed_blocks = parse_pdf(str(file_path))
        chunks = build_chunks_from_blocks(parsed_blocks)

        chunk_dicts = [
            {
                "id": str(uuid.uuid4()),
                "document_id": doc_id,
                "chunk_index": c.chunk_index,
                "section_title": c.section_title,
                "page_start": c.page_start,
                "page_end": c.page_end,
                "text": c.text,
                "word_count": c.word_count,
            }
            for c in chunks
        ]

        async with get_db() as db:
            # Batch insert chunks
            chunk_rows = [
                (
                    cd["id"],
                    cd["document_id"],
                    cd["chunk_index"],
                    cd["section_title"],
                    cd["page_start"],
                    cd["page_end"],
                    cd["text"],
                    cd["word_count"],
                )
                for cd in chunk_dicts
            ]

            await db.executemany(
                """
                INSERT INTO chunks (id, document_id, chunk_index, section_title, page_start, page_end, text, word_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                chunk_rows,
            )

            # Transition document status to "embedding"
            await db.execute(
                """
                UPDATE documents
                SET page_count = ?, status = 'embedding', error_message = NULL
                WHERE id = ?
                """,
                (page_count, doc_id),
            )
            await db.commit()

        # 5. Embed chunks and upsert to Qdrant vector store
        upsert_chunks(doc_id, chunk_dicts)

        # 6. Transition document status to "ready"
        async with get_db() as db:
            await db.execute(
                """
                UPDATE documents
                SET status = 'ready', error_message = NULL
                WHERE id = ?
                """,
                (doc_id,),
            )
            await db.commit()

        return DocumentUploadResponse(
            id=doc_id,
            filename=original_filename,
            page_count=page_count,
            status="ready",
            chunk_count=len(chunks),
            error_message=None,
        )

    except Exception as e:
        error_msg = str(e)
        async with get_db() as db:
            await db.execute(
                """
                UPDATE documents
                SET status = 'failed', error_message = ?
                WHERE id = ?
                """,
                (error_msg, doc_id),
            )
            await db.commit()

        return DocumentUploadResponse(
            id=doc_id,
            filename=original_filename,
            page_count=0,
            status="failed",
            chunk_count=0,
            error_message=error_msg,
        )


@router.get("", response_model=List[DocumentResponse])
async def list_documents():
    """List all documents with page counts, processing status, and chunk counts."""
    async with get_db() as db:
        async with db.execute(
            """
            SELECT d.id, d.filename, d.upload_date, d.page_count, d.status, d.error_message,
                   COUNT(c.id) AS chunk_count
            FROM documents d
            LEFT JOIN chunks c ON d.id = c.document_id
            GROUP BY d.id
            ORDER BY d.upload_date DESC
            """
        ) as cursor:
            rows = await cursor.fetchall()
            return [
                DocumentResponse(
                    id=row["id"],
                    filename=row["filename"],
                    upload_date=row["upload_date"],
                    page_count=row["page_count"],
                    status=row["status"],
                    chunk_count=row["chunk_count"],
                    error_message=row["error_message"],
                )
                for row in rows
            ]


@router.get("/{document_id}/chunks", response_model=List[ChunkResponse])
async def get_document_chunks(document_id: str):
    """Retrieve all chunks for a document ordered by chunk_index."""
    async with get_db() as db:
        # Check document existence
        async with db.execute("SELECT id FROM documents WHERE id = ?", (document_id,)) as cursor:
            doc_row = await cursor.fetchone()
            if not doc_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )

        # Retrieve chunks
        async with db.execute(
            """
            SELECT id, document_id, chunk_index, section_title, page_start, page_end, word_count, text
            FROM chunks
            WHERE document_id = ?
            ORDER BY chunk_index ASC
            """,
            (document_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [
                ChunkResponse(
                    id=row["id"],
                    document_id=row["document_id"],
                    chunk_index=row["chunk_index"],
                    section_title=row["section_title"],
                    page_start=row["page_start"],
                    page_end=row["page_end"],
                    word_count=row["word_count"],
                    text=row["text"],
                )
                for row in rows
            ]


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(document_id: str):
    """Delete a document, its database records, its vectors from Qdrant, and remove the file from disk."""
    async with get_db() as db:
        async with db.execute("SELECT filename FROM documents WHERE id = ?", (document_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )

        # 1. Remove vectors from Qdrant
        delete_document_vectors(document_id)

        # 2. Remove from database (chunks deleted via CASCADE foreign key)
        await db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        await db.commit()

    # 3. Remove file from disk
    for p in UPLOAD_DIR.glob(f"{document_id}_*"):
        try:
            if p.is_file():
                p.unlink()
        except OSError:
            pass

    return {
        "message": "Document and associated chunks deleted successfully.",
        "id": document_id,
    }


@router.post("/{document_id}/search", response_model=SearchResponse)
async def search_document_chunks(document_id: str, payload: SearchRequest):
    """
    Retrieve top-k relevant chunks for a query within a document using dense vector search.
    """
    async with get_db() as db:
        async with db.execute(
            "SELECT id, filename, status FROM documents WHERE id = ?", (document_id,)
        ) as cursor:
            doc = await cursor.fetchone()
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )
            if doc["status"] != "ready":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document is not ready for search (current status: '{doc['status']}').",
                )

    try:
        results = search(
            document_id=document_id,
            query=payload.query,
            top_k=payload.top_k,
        )
        return SearchResponse(
            results=[
                SearchResultItem(
                    chunk_id=r["chunk_id"],
                    section_title=r["section_title"],
                    page_start=r["page_start"],
                    page_end=r["page_end"],
                    text=r["text"],
                    score=r["score"],
                )
                for r in results
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}",
        )

