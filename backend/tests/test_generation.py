import uuid
from datetime import datetime, timezone
import pytest
import httpx
from app.database import get_db


@pytest.fixture
async def uploaded_synthetic_doc_for_gen(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    require_qdrant,
):
    """Fixture that uploads the synthetic PDF and yields document data, cleaning up on exit."""
    files = {"file": ("datum_gen_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
    resp = await client.post("/documents/upload", files=files)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "ready"
    doc_id = data["id"]
    try:
        yield data
    finally:
        await client.delete(f"/documents/{doc_id}")


@pytest.mark.asyncio
async def test_ask_returns_grounded_answer_with_valid_citations(
    client: httpx.AsyncClient,
    uploaded_synthetic_doc_for_gen: dict,
    require_qdrant,
    require_groq,
):
    """
    Ask 'What port does TestSensorComponent expose?':
    - Asserts answer mentions 'pp_TestSignal'.
    - Asserts citations list is non-empty.
    - Asserts every citation corresponds to a real chunk belonging to this document.
    - Asserts citation excerpt appears in that chunk's stored text.
    """
    doc_id = uploaded_synthetic_doc_for_gen["id"]

    # Fetch real document chunks to cross-check citations
    chunks_resp = await client.get(f"/documents/{doc_id}/chunks")
    assert chunks_resp.status_code == 200
    stored_chunks = {c["id"]: c["text"] for c in chunks_resp.json()}

    ask_resp = await client.post(
        f"/documents/{doc_id}/ask",
        json={"question": "What port does TestSensorComponent expose?"},
    )
    assert ask_resp.status_code == 200
    data = ask_resp.json()

    # Verify answer grounding
    answer_text = data.get("answer", "")
    assert "pp_testsignal" in answer_text.lower(), (
        f"Expected answer to mention 'pp_TestSignal', but received:\n{answer_text}"
    )

    # Verify citations are present and non-empty
    citations = data.get("citations", [])
    assert len(citations) > 0, f"Expected non-empty citations for grounded answer: {data}"

    # Verify each citation is valid against stored chunks
    for cit in citations:
        c_id = cit.get("chunk_id")
        assert c_id in stored_chunks, (
            f"Citation chunk_id '{c_id}' does not match any chunk stored for document {doc_id}!"
        )
        excerpt = cit.get("excerpt", "")
        assert excerpt and excerpt in stored_chunks[c_id], (
            f"Citation excerpt is not contained in the stored chunk text!\nExcerpt: '{excerpt}'\nChunk text: '{stored_chunks[c_id]}'"
        )


@pytest.mark.asyncio
async def test_ask_refuses_out_of_scope_question(
    client: httpx.AsyncClient,
    uploaded_synthetic_doc_for_gen: dict,
    require_qdrant,
    require_groq,
):
    """
    Ask something entirely absent from the fixture (e.g. 'What is the UDS negative response code for security access?'):
    - Asserts confidence == 'low'
    - Asserts citations == []
    """
    doc_id = uploaded_synthetic_doc_for_gen["id"]

    ask_resp = await client.post(
        f"/documents/{doc_id}/ask",
        json={"question": "What is the UDS negative response code for security access?"},
    )
    assert ask_resp.status_code == 200
    data = ask_resp.json()

    assert data.get("confidence") == "low", (
        f"Expected confidence 'low' for out-of-scope question, but got '{data.get('confidence')}'. Answer: {data.get('answer')}"
    )
    assert data.get("citations") == [], (
        f"Expected empty citations for out-of-scope question, but got: {data.get('citations')}"
    )


@pytest.mark.asyncio
async def test_ask_rejects_non_ready_document(client: httpx.AsyncClient):
    """
    Attempt to ask a question against:
    1. A nonexistent document id -> asserts HTTP 404 Not Found.
    2. A document in 'processing' status -> asserts HTTP 409 Conflict.
    """
    nonexistent_id = str(uuid.uuid4())
    resp_404 = await client.post(
        f"/documents/{nonexistent_id}/ask",
        json={"question": "Is this document ready?"},
    )
    assert resp_404.status_code == 404
    assert "not found" in resp_404.json().get("detail", "").lower()

    # Create a document record in 'processing' status directly in SQLite
    processing_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO documents (id, filename, upload_date, page_count, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (processing_id, "in_progress_spec.pdf", now_iso, 0, "processing", None),
        )
        await db.commit()

    try:
        resp_409 = await client.post(
            f"/documents/{processing_id}/ask",
            json={"question": "What does this specification describe?"},
        )
        assert resp_409.status_code == 409
        assert "not ready" in resp_409.json().get("detail", "").lower()
    finally:
        async with get_db() as db:
            await db.execute("DELETE FROM documents WHERE id = ?", (processing_id,))
            await db.commit()
