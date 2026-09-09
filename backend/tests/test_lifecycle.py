import pytest
import httpx


@pytest.mark.asyncio
async def test_delete_removes_chunks_and_vectors(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    require_qdrant,
):
    """
    Upload a document, verify chunks exist, delete the document, and assert:
    - DELETE /documents/{id} returns 200
    - GET /documents/{id}/chunks returns 404
    - POST /documents/{id}/search returns 404
    - GET /documents list no longer contains the document
    """
    files = {"file": ("lifecycle_test_doc.pdf", synthetic_pdf_bytes, "application/pdf")}
    upload_resp = await client.post("/documents/upload", files=files)
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # Verify chunks exist before deletion
    chunks_resp = await client.get(f"/documents/{doc_id}/chunks")
    assert chunks_resp.status_code == 200
    assert len(chunks_resp.json()) > 0

    # Delete the document
    del_resp = await client.delete(f"/documents/{doc_id}")
    assert del_resp.status_code == 200

    # Verify GET /documents/{id}/chunks returns 404
    chunks_after_del = await client.get(f"/documents/{doc_id}/chunks")
    assert chunks_after_del.status_code == 404

    # Verify POST /documents/{id}/search returns 404
    search_after_del = await client.post(
        f"/documents/{doc_id}/search",
        json={"query": "TestSensorComponent", "top_k": 3},
    )
    assert search_after_del.status_code == 404

    # Verify document list no longer contains this id
    list_resp = await client.get("/documents")
    assert list_resp.status_code == 200
    doc_ids = [d["id"] for d in list_resp.json()]
    assert doc_id not in doc_ids


@pytest.mark.asyncio
async def test_history_records_exchange(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    require_qdrant,
    require_groq,
):
    """
    After an /ask call, assert GET /documents/{id}/history contains the exchange
    with matching question, answer, citations, and confidence.
    """
    files = {"file": ("history_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
    upload_resp = await client.post("/documents/upload", files=files)
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    try:
        question = "What port does TestSensorComponent expose?"
        ask_resp = await client.post(
            f"/documents/{doc_id}/ask",
            json={"question": question},
        )
        assert ask_resp.status_code == 200
        ask_data = ask_resp.json()

        # Retrieve audit history
        hist_resp = await client.get(f"/documents/{doc_id}/history")
        assert hist_resp.status_code == 200
        history_items = hist_resp.json()

        assert len(history_items) >= 1, "Expected at least one recorded Q&A exchange in history."
        latest = history_items[0]

        assert latest["document_id"] == doc_id
        assert latest["question"] == question
        assert latest["answer"] == ask_data["answer"]
        assert latest["confidence"] == ask_data["confidence"]

        # Verify recorded citations match
        assert len(latest["citations"]) == len(ask_data["citations"])
        for exp_cit, act_cit in zip(ask_data["citations"], latest["citations"]):
            assert exp_cit["marker"] == act_cit["marker"]
            assert exp_cit["chunk_id"] == act_cit["chunk_id"]
            assert exp_cit["excerpt"] == act_cit["excerpt"]

    finally:
        await client.delete(f"/documents/{doc_id}")
