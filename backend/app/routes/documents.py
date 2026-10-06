import csv
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Query, Response
from app.database import get_db, UPLOAD_DIR, MAX_UPLOAD_MB, MAX_UPLOAD_BYTES
from app.models import (
    DocumentResponse,
    DocumentUploadResponse,
    ChunkResponse,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    AskRequest,
    AskResponse,
    ChatHistoryItem,
    CitationItem,
    ExtractedEntity,
    ExtractionResult,
    ComparisonResult,
    DependencyMapResult,
    DependencyNode,
    CompletenessAuditResult,
    InconsistencyIssue,
)
from app.parsing import parse_pdf
from app.chunking import build_chunks_from_blocks
from app.vectorstore import upsert_chunks, delete_document_vectors, search
from app.generation import generate_answer, validate_citations, evaluate_confidence
from app.extraction import extract_document_entities

logger = logging.getLogger(__name__)
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
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
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
        raw_chunks = build_chunks_from_blocks(parsed_blocks)

        # Deduplicate chunks by exact text within the same document as a safety net
        seen_chunk_texts = set()
        unique_chunks = []
        for c in raw_chunks:
            normalized_c_text = " ".join(c.text.split())
            if normalized_c_text in seen_chunk_texts:
                logger.warning(
                    f"Skipping duplicate chunk text in document '{doc_id}' "
                    f"(index={c.chunk_index}, words={c.word_count}): '{c.text[:80]}...'"
                )
                continue
            seen_chunk_texts.add(normalized_c_text)
            unique_chunks.append(c)

        # Re-index unique chunks sequentially
        for idx, c in enumerate(unique_chunks):
            c.chunk_index = idx

        chunks = unique_chunks

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


@router.post("/{document_id}/ask", response_model=AskResponse)
async def ask_document_question(document_id: str, payload: AskRequest):
    """
    Ask a question against an ingested document:
    - Verifies document readiness (status 'ready' and non-zero chunks, else 409 Conflict)
    - Retrieves top 5 chunks via vector similarity
    - Synthesizes an evidence-grounded answer using Groq
    - Validates bracket citations [N], stripping any invented markers
    - Evaluates retrieval/answer confidence
    - Records the Q&A exchange in the chat_history audit log
    """
    # 1. Validate document existence, status, and chunk count
    async with get_db() as db:
        async with db.execute(
            """
            SELECT d.id, d.status, COUNT(c.id) AS chunk_count
            FROM documents d
            LEFT JOIN chunks c ON d.id = c.document_id
            WHERE d.id = ?
            GROUP BY d.id
            """,
            (document_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )
            if row["status"] != "ready":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Document is not ready for questions (current status: '{row['status']}').",
                )
            if row["chunk_count"] == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Document has no ingested content chunks to query.",
                )

    # 2. Retrieve relevant chunks from vector store
    search_results = search(
        document_id=document_id,
        query=payload.question,
        top_k=5,
    )

    top_score = search_results[0]["score"] if search_results else 0.0

    # 3. Format sources with 1-based sequential markers
    sources = [
        {
            "marker": idx + 1,
            "chunk_id": r["chunk_id"],
            "section_title": r.get("section_title"),
            "page_start": r["page_start"],
            "page_end": r["page_end"],
            "text": r["text"],
        }
        for idx, r in enumerate(search_results)
    ]

    # 4. Generate answer with Groq LLM
    raw_answer = generate_answer(question=payload.question, sources=sources)

    # 5. Validate citations and strip ungrounded markers
    cleaned_answer, validated_citations = validate_citations(raw_answer, sources)

    # 6. Evaluate confidence flag
    confidence, low_confidence_reason = evaluate_confidence(
        top_retrieval_score=top_score,
        answer=cleaned_answer,
    )

    # 7. Record exchange in chat_history audit log
    history_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    citations_json = json.dumps(validated_citations)

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO chat_history (id, document_id, question, answer, citations_json, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                history_id,
                document_id,
                payload.question.strip(),
                cleaned_answer,
                citations_json,
                confidence,
                now_iso,
            ),
        )
        await db.commit()

    return AskResponse(
        answer=cleaned_answer,
        citations=[CitationItem(**c) for c in validated_citations],
        confidence=confidence,
        low_confidence_reason=low_confidence_reason,
    )


@router.get("/{document_id}/history", response_model=List[ChatHistoryItem])
async def get_document_history(document_id: str):
    """
    Retrieve audit history of past Q&A exchanges for a document, ordered most recent first.
    """
    async with get_db() as db:
        # Check document existence
        async with db.execute("SELECT id FROM documents WHERE id = ?", (document_id,)) as cursor:
            doc = await cursor.fetchone()
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )

        async with db.execute(
            """
            SELECT id, document_id, question, answer, citations_json, confidence, created_at
            FROM chat_history
            WHERE document_id = ?
            ORDER BY created_at DESC
            """,
            (document_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [
                ChatHistoryItem(
                    id=row["id"],
                    document_id=row["document_id"],
                    question=row["question"],
                    answer=row["answer"],
                    citations=[CitationItem(**c) for c in json.loads(row["citations_json"])],
                    confidence=row["confidence"],
                    created_at=row["created_at"],
                )
                for row in rows
            ]


async def _get_or_create_extraction(
    document_id: str,
    force_refresh: bool = False,
    max_batches: Optional[int] = None,
) -> tuple[ExtractionResult, str]:
    """Helper to retrieve cached extraction or run a fresh extraction pass."""
    async with get_db() as db:
        async with db.execute("SELECT id, filename, status FROM documents WHERE id = ?", (document_id,)) as cursor:
            doc = await cursor.fetchone()
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id '{document_id}' not found.",
                )
            if doc["status"] != "ready":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Document is not ready for extraction (current status: '{doc['status']}').",
                )
            filename = doc["filename"]

        if not force_refresh:
            async with db.execute(
                "SELECT entities_json, generated_at FROM extractions WHERE document_id = ?",
                (document_id,),
            ) as cursor:
                cached = await cursor.fetchone()
                if cached:
                    raw_entities = json.loads(cached["entities_json"])
                    return (
                        ExtractionResult(
                            document_id=document_id,
                            entities=[ExtractedEntity(**e) for e in raw_entities],
                            generated_at=cached["generated_at"],
                        ),
                        filename,
                    )

    # Run extraction sweep
    result = await extract_document_entities(document_id, max_batches=max_batches)
    entities_json = json.dumps([e.model_dump() for e in result.entities])

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO extractions (id, document_id, entities_json, generated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(document_id) DO UPDATE SET
                entities_json = excluded.entities_json,
                generated_at = excluded.generated_at
            """,
            (str(uuid.uuid4()), document_id, entities_json, result.generated_at),
        )
        await db.commit()

    return result, filename


@router.get("/{document_id}/extract", response_model=ExtractionResult)
async def get_document_extraction(
    document_id: str,
    force_refresh: bool = Query(False, description="Force re-running the extraction sweep bypassing cache"),
    max_batches: Optional[int] = Query(None, description="Optional limit on number of batches to process"),
):
    """
    Extract technical entities (components, ports, interfaces, signals) across all chunks of a document.
    Results are cached in SQLite; use ?force_refresh=true to re-run.
    """
    result, _ = await _get_or_create_extraction(document_id, force_refresh=force_refresh, max_batches=max_batches)
    return result


@router.get("/{document_id}/extract/export")
async def export_document_extraction(
    document_id: str,
    format: str = Query("json", pattern="^(csv|json)$", description="Export file format ('csv' or 'json')"),
):
    """
    Export the extracted structured entities as a downloadable CSV or JSON file.
    """
    result, filename = await _get_or_create_extraction(document_id, force_refresh=False)
    base_name = sanitize_filename(Path(filename).stem)

    if format == "json":
        json_content = json.dumps(result.model_dump(), indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_extractions.json"'},
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Name", "Type", "Description", "Section", "Page Start", "Page End", "Chunk ID"])
        for ent in result.entities:
            writer.writerow(
                [
                    ent.name,
                    ent.entity_type,
                    ent.description,
                    ent.section_title or "",
                    ent.page_start,
                    ent.page_end,
                    ent.source_chunk_id,
                ]
            )
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_extractions.csv"'},
        )


@router.get("/{document_id}/compare/{other_document_id}", response_model=ComparisonResult)
async def compare_documents(document_id: str, other_document_id: str):
    """
    Compare architectural entities between two AUTOSAR documents or revisions.
    Identifies shared elements, unique components, interface mismatches, and inconsistencies.
    """
    if document_id == other_document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot compare a document with itself. Please select two distinct documents.",
        )

    res_a, filename_a = await _get_or_create_extraction(document_id, force_refresh=False)
    res_b, filename_b = await _get_or_create_extraction(other_document_id, force_refresh=False)

    entities_a = res_a.entities
    entities_b = res_b.entities

    dict_a = {e.name.lower().strip(): e for e in entities_a}
    dict_b = {e.name.lower().strip(): e for e in entities_b}

    shared_names = set(dict_a.keys()) & set(dict_b.keys())
    unique_a_names = set(dict_a.keys()) - set(dict_b.keys())
    unique_b_names = set(dict_b.keys()) - set(dict_a.keys())

    shared_entities = [dict_a[k] for k in shared_names]
    unique_to_a = [dict_a[k] for k in unique_a_names]
    unique_to_b = [dict_b[k] for k in unique_b_names]

    inconsistencies: list[InconsistencyIssue] = []

    # 1. Type conflicts and description divergence on shared names
    for name in shared_names:
        ea = dict_a[name]
        eb = dict_b[name]
        if ea.entity_type != eb.entity_type:
            inconsistencies.append(
                InconsistencyIssue(
                    severity="warning",
                    category="Type Conflict",
                    entity_name=ea.name,
                    description=f"Classified as '{ea.entity_type}' in {filename_a} but as '{eb.entity_type}' in {filename_b}.",
                    recommendation="Reconcile architectural definition to ensure uniform classification across specification layers.",
                )
            )
        elif abs(len(ea.description) - len(eb.description)) > 100:
            inconsistencies.append(
                InconsistencyIssue(
                    severity="notice",
                    category="Specification Scope Divergence",
                    entity_name=ea.name,
                    description=f"Significant divergence in architectural description depth between {filename_a} (p.{ea.page_start}) and {filename_b} (p.{eb.page_start}).",
                    recommendation="Align interface documentation between high-level description and module template.",
                )
            )

    # 2. Cross-document interface dependencies
    ports_a = [e for e in entities_a if e.entity_type == "port"]
    interfaces_b = {e.name.lower().strip() for e in entities_b if e.entity_type == "interface"}
    for p in ports_a:
        if "interface" in p.description.lower() and interfaces_b:
            if not any(iface in p.description.lower() for iface in interfaces_b):
                inconsistencies.append(
                    InconsistencyIssue(
                        severity="notice",
                        category="Cross-Spec Interface Dependency",
                        entity_name=p.name,
                        description=f"Port in '{filename_a}' references interface semantics not defined in '{filename_b}'.",
                        recommendation="Verify whether interface definition resides in another AUTOSAR package.",
                    )
                )

    compatibility_score = round(
        (len(shared_names) * 2 / max(len(entities_a) + len(entities_b), 1)) * 100, 1
    )

    summary = (
        f"Compared '{filename_a}' ({len(entities_a)} entities) against '{filename_b}' ({len(entities_b)} entities). "
        f"Identified {len(shared_entities)} shared architectural elements, {len(inconsistencies)} potential inconsistencies, "
        f"and a {compatibility_score}% cross-specification overlap."
    )

    return ComparisonResult(
        doc_a_id=document_id,
        doc_a_name=filename_a,
        doc_b_id=other_document_id,
        doc_b_name=filename_b,
        total_entities_a=len(entities_a),
        total_entities_b=len(entities_b),
        shared_entities=shared_entities,
        unique_to_a=unique_to_a,
        unique_to_b=unique_to_b,
        inconsistencies=inconsistencies,
        compatibility_score=compatibility_score,
        summary=summary,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/{document_id}/compare/{other_document_id}/export")
async def export_document_comparison(
    document_id: str,
    other_document_id: str,
    format: str = Query("json", pattern="^(markdown|json|csv)$", description="Export format ('markdown', 'json', or 'csv')"),
):
    """
    Export the document comparison and inconsistency report as Markdown, JSON, or CSV.
    """
    comp = await compare_documents(document_id, other_document_id)
    base_name = f"{sanitize_filename(Path(comp.doc_a_name).stem)}_vs_{sanitize_filename(Path(comp.doc_b_name).stem)}"

    if format == "json":
        return Response(
            content=json.dumps(comp.model_dump(), indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_comparison.json"'},
        )
    elif format == "markdown":
        md = [
            "# AUTOSAR Specification Comparison & Inconsistency Report",
            f"- **Document A**: {comp.doc_a_name} ({comp.total_entities_a} entities)",
            f"- **Document B**: {comp.doc_b_name} ({comp.total_entities_b} entities)",
            f"- **Cross-Specification Compatibility Score**: {comp.compatibility_score}%",
            f"- **Generated At**: {comp.generated_at}",
            "",
            "## Executive Summary",
            comp.summary,
            "",
            f"## Identified Architectural Inconsistencies & Warnings ({len(comp.inconsistencies)})",
        ]
        for idx, inc in enumerate(comp.inconsistencies, 1):
            md.append(f"### {idx}. [{inc.severity.upper()}] {inc.category}: {inc.entity_name}")
            md.append(f"- **Description**: {inc.description}")
            if inc.recommendation:
                md.append(f"- **Recommendation**: {inc.recommendation}")
            md.append("")

        md.append(f"## Shared Architectural Entities ({len(comp.shared_entities)})")
        for ent in comp.shared_entities:
            md.append(f"- **{ent.name}** (`{ent.entity_type}`): {ent.description} (p.{ent.page_start})")
        md.append("")

        return Response(
            content="\n".join(md),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_inconsistency_report.md"'},
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Category", "Severity", "Entity Name", "Description", "Recommendation"])
        for inc in comp.inconsistencies:
            writer.writerow([inc.category, inc.severity, inc.entity_name, inc.description, inc.recommendation or ""])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_inconsistencies.csv"'},
        )


@router.get("/{document_id}/dependencies", response_model=DependencyMapResult)
async def get_document_dependencies(document_id: str):
    """
    Generate interface and dependency mappings linking components to ports, interfaces, and signals.
    """
    res, filename = await _get_or_create_extraction(document_id, force_refresh=False)
    entities = res.entities

    components = [e for e in entities if e.entity_type == "component"]
    ports = [e for e in entities if e.entity_type == "port"]
    interfaces = [e for e in entities if e.entity_type == "interface"]
    signals = [e for e in entities if e.entity_type == "signal"]

    # Fallback if no components identified, treat key entities as nodes
    target_nodes = components if components else entities[:6]

    nodes: list[DependencyNode] = []
    total_connections = 0

    for comp in target_nodes:
        comp_name_lower = comp.name.lower()
        # Find related ports
        related_ports = [
            p.name for p in ports
            if comp_name_lower in p.name.lower() or comp_name_lower in p.description.lower() or (comp.section_title and p.section_title == comp.section_title)
        ]
        if not related_ports and ports:
            related_ports = [p.name for p in ports if abs(p.page_start - comp.page_start) <= 6][:3]

        # Find related interfaces
        related_ifaces = [
            i.name for i in interfaces
            if comp_name_lower in i.name.lower() or any(p.lower() in i.description.lower() for p in related_ports) or (comp.section_title and i.section_title == comp.section_title)
        ]
        if not related_ifaces and interfaces:
            related_ifaces = [i.name for i in interfaces if abs(i.page_start - comp.page_start) <= 6][:2]

        # Find related signals
        related_signals = [
            s.name for s in signals
            if any(iface.lower() in s.description.lower() for iface in related_ifaces) or (comp.section_title and s.section_title == comp.section_title)
        ]
        if not related_signals and signals:
            related_signals = [s.name for s in signals if abs(s.page_start - comp.page_start) <= 6][:3]

        flow_type = "provided"
        desc_lower = comp.description.lower()
        if "client" in desc_lower or "require" in desc_lower or "rx" in desc_lower:
            flow_type = "required"
        elif "bidirectional" in desc_lower or "gateway" in desc_lower:
            flow_type = "bidirectional"
        elif "internal" in desc_lower:
            flow_type = "internal"

        pages = sorted(list(set([comp.page_start, comp.page_end])))
        total_connections += len(related_ports) + len(related_ifaces)

        nodes.append(
            DependencyNode(
                component=comp.name,
                ports=related_ports,
                interfaces=related_ifaces,
                signals=related_signals,
                flow_type=flow_type,
                page_references=pages,
                section=comp.section_title,
            )
        )

    return DependencyMapResult(
        document_id=document_id,
        filename=filename,
        nodes=nodes,
        total_components=len(components),
        total_interfaces=len(interfaces),
        total_connections=total_connections,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/{document_id}/audit", response_model=CompletenessAuditResult)
async def get_document_audit(document_id: str):
    """
    Run architectural completeness and consistency audit on an AUTOSAR document.
    Calculates health score and checks for missing definitions, dangling ports, or orphan signals.
    """
    res, filename = await _get_or_create_extraction(document_id, force_refresh=False)
    entities = res.entities

    components = [e for e in entities if e.entity_type == "component"]
    ports = [e for e in entities if e.entity_type == "port"]
    interfaces = [e for e in entities if e.entity_type == "interface"]
    signals = [e for e in entities if e.entity_type == "signal"]

    issues: list[InconsistencyIssue] = []

    # 1. Components with minimal or missing description
    for c in components:
        if len(c.description.strip()) < 25:
            issues.append(
                InconsistencyIssue(
                    severity="warning",
                    category="Incomplete Architecture Description",
                    entity_name=c.name,
                    description=f"Component '{c.name}' has minimal behavioral specification in section '{c.section_title or 'General'}'.",
                    recommendation="Add detailed behavioral description and execution requirements.",
                )
            )

    # 2. Ports declared without explicit interfaces
    if ports and not interfaces:
        issues.append(
            InconsistencyIssue(
                severity="critical",
                category="Missing Interface Specification",
                entity_name="Port Architecture",
                description="Ports are declared in the document, but no corresponding formal interface templates were found.",
                recommendation="Ensure Sender-Receiver or Client-Server interface definitions are referenced.",
            )
        )

    # 3. Signals without enclosing section
    for s in signals:
        if not s.section_title:
            issues.append(
                InconsistencyIssue(
                    severity="notice",
                    category="Orphan Signal Reference",
                    entity_name=s.name,
                    description=f"Signal '{s.name}' detected on page {s.page_start} without an enclosing section heading.",
                    recommendation="Link signal to its corresponding data element and port interface.",
                )
            )

    # Calculate overall health score
    deductions = (
        len([i for i in issues if i.severity == "critical"]) * 20
        + len([i for i in issues if i.severity == "warning"]) * 8
        + len([i for i in issues if i.severity == "notice"]) * 3
    )
    health_score = max(55, min(100, 100 - deductions)) if entities else 70

    return CompletenessAuditResult(
        document_id=document_id,
        filename=filename,
        health_score=health_score,
        total_components=len(components),
        total_ports=len(ports),
        total_interfaces=len(interfaces),
        total_signals=len(signals),
        issues=issues,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )



