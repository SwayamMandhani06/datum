import pytest
import httpx


@pytest.mark.asyncio
async def test_search_returns_relevant_chunk(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    require_qdrant,
):
    """
    Search for 'TestSensorComponent port':
    - Asserts top result's text contains 'pp_TestSignal'
    - Proves embeddings + retrieval find the semantically correct chunk, not arbitrary chunks.
    """
    files = {"file": ("datum_retrieval_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
    upload_resp = await client.post("/documents/upload", files=files)
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    try:
        search_resp = await client.post(
            f"/documents/{doc_id}/search",
            json={"query": "TestSensorComponent port", "top_k": 3},
        )
        assert search_resp.status_code == 200
        data = search_resp.json()
        results = data.get("results", [])

        assert len(results) > 0, f"Expected search results for doc {doc_id}, got none."
        top_result = results[0]
        assert "pp_TestSignal" in top_result["text"], (
            f"Expected top search result to contain 'pp_TestSignal', but got: {top_result['text']}"
        )
    finally:
        await client.delete(f"/documents/{doc_id}")


@pytest.mark.asyncio
async def test_search_is_scoped_to_document(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    secondary_pdf_bytes: bytes,
    require_qdrant,
):
    """
    Upload two distinct synthetic documents:
    - Document A: sensor and actuator components (ports pp_TestSignal, pp_ActuatorCommand)
    - Document B: high-voltage battery component (port pp_BatteryVoltage)
    Search Document A for 'battery voltage pp_BatteryVoltage':
    - Asserts searching Document A NEVER returns chunks belonging to Document B.
    """
    # Upload Document A
    files_a = {"file": ("doc_a_sensor.pdf", synthetic_pdf_bytes, "application/pdf")}
    resp_a = await client.post("/documents/upload", files=files_a)
    assert resp_a.status_code == 201
    doc_a_id = resp_a.json()["id"]

    # Upload Document B
    files_b = {"file": ("doc_b_battery.pdf", secondary_pdf_bytes, "application/pdf")}
    resp_b = await client.post("/documents/upload", files=files_b)
    assert resp_b.status_code == 201
    doc_b_id = resp_b.json()["id"]

    try:
        # Fetch chunk IDs for Document B to verify cross-contamination
        chunks_b_resp = await client.get(f"/documents/{doc_b_id}/chunks")
        assert chunks_b_resp.status_code == 200
        b_chunk_ids = {c["id"] for c in chunks_b_resp.json()}

        # Search Document A for battery terms that only exist in Document B
        search_resp = await client.post(
            f"/documents/{doc_a_id}/search",
            json={"query": "battery cell voltage pp_BatteryVoltage", "top_k": 5},
        )
        assert search_resp.status_code == 200
        results_a = search_resp.json().get("results", [])

        for r in results_a:
            assert r["chunk_id"] not in b_chunk_ids, (
                f"Document A search returned chunk {r['chunk_id']} which belongs to Document B!"
            )
            assert "pp_BatteryVoltage" not in r["text"], (
                f"Document A search leaked text from Document B: '{r['text'][:80]}...'"
            )

        # Conversely, search Document B for pp_BatteryVoltage and confirm it IS returned there
        search_b_resp = await client.post(
            f"/documents/{doc_b_id}/search",
            json={"query": "battery cell voltage pp_BatteryVoltage", "top_k": 3},
        )
        assert search_b_resp.status_code == 200
        results_b = search_b_resp.json().get("results", [])
        assert len(results_b) > 0
        assert "pp_BatteryVoltage" in results_b[0]["text"]

    finally:
        await client.delete(f"/documents/{doc_a_id}")
        await client.delete(f"/documents/{doc_b_id}")
