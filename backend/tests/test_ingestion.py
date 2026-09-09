import pytest
import httpx
import app.routes.documents as docs_route


@pytest.mark.asyncio
async def test_upload_valid_pdf_returns_ready_status(client: httpx.AsyncClient, synthetic_pdf_bytes: bytes, require_qdrant):
    """
    Test uploading a valid synthetic PDF:
    - Verifies response status is 201 Created.
    - Verifies document status transitions to 'ready'.
    - Verifies page_count is sensible (3 pages) and chunk_count is sensible (> 0).
    """
    files = {"file": ("datum_test_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
    response = await client.post("/documents/upload", files=files)

    assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}: {response.text}"
    data = response.json()
    doc_id = data["id"]

    try:
        assert data["filename"] == "datum_test_spec.pdf"
        assert data["status"] == "ready", f"Document upload did not reach 'ready' status: {data.get('error_message')}"
        assert data["page_count"] == 3
        assert data["chunk_count"] > 0
        assert data["error_message"] is None

        # Verify listing endpoint also reflects the uploaded document as ready
        list_resp = await client.get("/documents")
        assert list_resp.status_code == 200
        docs = list_resp.json()
        matching = [d for d in docs if d["id"] == doc_id]
        assert len(matching) == 1
        assert matching[0]["status"] == "ready"
        assert matching[0]["chunk_count"] == data["chunk_count"]
    finally:
        # Clean up created document
        await client.delete(f"/documents/{doc_id}")


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf(client: httpx.AsyncClient):
    """
    Test uploading a non-PDF file (.txt):
    - Asserts HTTP 400 Bad Request.
    - Asserts error message explains that only PDF files are supported.
    """
    files = {"file": ("test_doc.txt", b"This is plain text, not a PDF specification.", "text/plain")}
    response = await client.post("/documents/upload", files=files)

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "only pdf files are supported" in detail.lower()


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(client: httpx.AsyncClient, monkeypatch):
    """
    Test uploading a file that exceeds MAX_UPLOAD_MB:
    - Asserts HTTP 413 Request Entity Too Large.
    """
    # Temporarily reduce max upload size to 1024 bytes (1 KB) for instantaneous verification
    monkeypatch.setattr(docs_route, "MAX_UPLOAD_BYTES", 1024)
    monkeypatch.setattr(docs_route, "MAX_UPLOAD_MB", 0.001)

    # 2048 bytes exceeds the 1024-byte limit
    oversized_bytes = b"%PDF-1.4 " + b"A" * 2040
    files = {"file": ("oversized_spec.pdf", oversized_bytes, "application/pdf")}
    response = await client.post("/documents/upload", files=files)

    assert response.status_code == 413
    detail = response.json().get("detail", "")
    assert "exceeds maximum allowed size" in detail.lower()
