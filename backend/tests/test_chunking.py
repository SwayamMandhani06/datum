import pytest
import httpx


@pytest.fixture
async def uploaded_synthetic_doc(client: httpx.AsyncClient, synthetic_pdf_bytes: bytes, require_qdrant):
    """Fixture that uploads the synthetic PDF and yields the document dict, cleaning up on exit."""
    files = {"file": ("datum_chunk_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
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
async def test_no_near_empty_chunks(client: httpx.AsyncClient, uploaded_synthetic_doc: dict):
    """
    Assert none of the generated chunks have fewer than ~15 words of content
    excluding the section title.
    """
    doc_id = uploaded_synthetic_doc["id"]
    resp = await client.get(f"/documents/{doc_id}/chunks")
    assert resp.status_code == 200
    chunks = resp.json()

    assert len(chunks) > 0, "Expected at least one chunk for uploaded synthetic doc."

    for c in chunks:
        title = c.get("section_title") or ""
        raw_text = c.get("text") or ""

        # Remove the section title prefix if present to measure pure body words
        if title and raw_text.startswith(title):
            body_text = raw_text[len(title):].strip()
        else:
            body_text = raw_text.strip()

        body_words = len(body_text.split())
        assert body_words >= 15, (
            f"Chunk {c['chunk_index']} ('{title}') has only {body_words} body words (< 15): '{raw_text}'"
        )


@pytest.mark.asyncio
async def test_no_duplicate_chunk_text(client: httpx.AsyncClient, uploaded_synthetic_doc: dict):
    """
    Assert no two chunks in the same document have identical text.
    Specifically guards against the running-header bug recurring.
    """
    doc_id = uploaded_synthetic_doc["id"]
    resp = await client.get(f"/documents/{doc_id}/chunks")
    assert resp.status_code == 200
    chunks = resp.json()

    seen_texts = set()
    for c in chunks:
        norm_text = " ".join(c["text"].split())
        assert norm_text not in seen_texts, (
            f"Duplicate chunk text detected in document {doc_id} at chunk index {c['chunk_index']}: '{norm_text[:80]}...'"
        )
        seen_texts.add(norm_text)


@pytest.mark.asyncio
async def test_running_header_excluded(client: httpx.AsyncClient, uploaded_synthetic_doc: dict):
    """
    Assert the literal string 'Datum Test Specification' (the fixture's fake running header)
    does not appear as its own standalone chunk or as a section title anywhere.
    """
    doc_id = uploaded_synthetic_doc["id"]
    resp = await client.get(f"/documents/{doc_id}/chunks")
    assert resp.status_code == 200
    chunks = resp.json()

    for c in chunks:
        title = (c.get("section_title") or "").strip()
        text = (c.get("text") or "").strip()

        assert title != "Datum Test Specification", (
            f"Running header was incorrectly detected as a section title in chunk {c['chunk_index']}."
        )
        assert text != "Datum Test Specification", (
            f"Running header became a standalone chunk at index {c['chunk_index']}."
        )
        assert not text.startswith("Datum Test Specification"), (
            f"Chunk {c['chunk_index']} begins with unstripped running header text: '{text[:60]}...'"
        )
