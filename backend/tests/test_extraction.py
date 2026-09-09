import csv
import io
import pytest
import httpx


@pytest.fixture
async def uploaded_extraction_doc(
    client: httpx.AsyncClient,
    synthetic_pdf_bytes: bytes,
    require_qdrant,
    require_groq,
):
    """Fixture that uploads the synthetic PDF and yields the document info, cleaning up after."""
    files = {"file": ("datum_extraction_spec.pdf", synthetic_pdf_bytes, "application/pdf")}
    upload_resp = await client.post("/documents/upload", files=files)
    assert upload_resp.status_code == 201
    data = upload_resp.json()
    assert data["status"] == "ready"
    doc_id = data["id"]
    try:
        yield data
    finally:
        await client.delete(f"/documents/{doc_id}")


@pytest.mark.asyncio
async def test_extraction_finds_known_entities(
    client: httpx.AsyncClient,
    uploaded_extraction_doc: dict,
    require_qdrant,
    require_groq,
):
    """
    Run extraction on the synthetic document:
    - Asserts 'TestSensorComponent' appears in results with entity_type == 'component'.
    - Asserts 'pp_TestSignal' appears in results with entity_type == 'port'.
    """
    doc_id = uploaded_extraction_doc["id"]
    extract_resp = await client.get(f"/documents/{doc_id}/extract")
    assert extract_resp.status_code == 200
    data = extract_resp.json()

    entities = data.get("entities", [])
    assert len(entities) > 0, f"Expected non-empty extracted entities for document {doc_id}."

    entity_map = {e["name"].lower(): e for e in entities}

    # Verify TestSensorComponent
    assert "testsensorcomponent" in entity_map, (
        f"Expected 'TestSensorComponent' to be extracted, found: {[e['name'] for e in entities]}"
    )
    sensor_comp = entity_map["testsensorcomponent"]
    assert sensor_comp["entity_type"] == "component", (
        f"Expected entity_type 'component' for TestSensorComponent, got '{sensor_comp['entity_type']}'"
    )
    assert len(sensor_comp["description"]) > 5
    assert sensor_comp["source_chunk_id"]

    # Verify pp_TestSignal
    assert "pp_testsignal" in entity_map, (
        f"Expected 'pp_TestSignal' to be extracted, found: {[e['name'] for e in entities]}"
    )
    signal_port = entity_map["pp_testsignal"]
    assert signal_port["entity_type"] == "port", (
        f"Expected entity_type 'port' for pp_TestSignal, got '{signal_port['entity_type']}'"
    )
    assert signal_port["source_chunk_id"]


@pytest.mark.asyncio
async def test_extraction_does_not_invent_entities(
    client: httpx.AsyncClient,
    uploaded_extraction_doc: dict,
    require_qdrant,
    require_groq,
):
    """
    Assert no returned entity name is absent from the fixture's actual text.
    Cross-checks each entity name is a substring of some chunk's text for that document.
    """
    doc_id = uploaded_extraction_doc["id"]

    # Fetch all stored chunk text
    chunks_resp = await client.get(f"/documents/{doc_id}/chunks")
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()
    full_doc_text = " ".join(c["text"] for c in chunks).lower()

    extract_resp = await client.get(f"/documents/{doc_id}/extract")
    assert extract_resp.status_code == 200
    entities = extract_resp.json().get("entities", [])

    assert len(entities) > 0

    for ent in entities:
        ent_name = ent["name"].strip().lower()
        assert ent_name in full_doc_text, (
            f"Extracted entity '{ent['name']}' was NOT found in any chunk text for document {doc_id}!"
        )


@pytest.mark.asyncio
async def test_extraction_is_cached(
    client: httpx.AsyncClient,
    uploaded_extraction_doc: dict,
    require_qdrant,
    require_groq,
):
    """
    Call the endpoint twice:
    - Asserts the generated_at timestamp is unchanged on the second call.
    - Confirms the extraction is served from SQLite cache without re-running LLM sweep.
    """
    doc_id = uploaded_extraction_doc["id"]

    # First call - populates cache
    resp1 = await client.get(f"/documents/{doc_id}/extract")
    assert resp1.status_code == 200
    data1 = resp1.json()
    gen_time_1 = data1["generated_at"]

    # Second call - should return cached result immediately
    resp2 = await client.get(f"/documents/{doc_id}/extract")
    assert resp2.status_code == 200
    data2 = resp2.json()
    gen_time_2 = data2["generated_at"]

    assert gen_time_1 == gen_time_2, (
        f"Expected cached result with matching generated_at, but got {gen_time_1} != {gen_time_2}"
    )
    assert len(data1["entities"]) == len(data2["entities"])


@pytest.mark.asyncio
async def test_export_formats(
    client: httpx.AsyncClient,
    uploaded_extraction_doc: dict,
    require_qdrant,
    require_groq,
):
    """
    Assert /extract/export?format=csv returns valid CSV with header row.
    Assert /extract/export?format=json returns valid JSON matching ExtractionResult schema.
    """
    doc_id = uploaded_extraction_doc["id"]

    # Ensure extraction is performed first
    await client.get(f"/documents/{doc_id}/extract")

    # Test CSV export
    csv_resp = await client.get(f"/documents/{doc_id}/extract/export?format=csv")
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "attachment;" in csv_resp.headers.get("content-disposition", "")

    csv_reader = csv.reader(io.StringIO(csv_resp.text))
    header = next(csv_reader)
    assert header == ["Name", "Type", "Description", "Section", "Page Start", "Page End", "Chunk ID"]

    rows = list(csv_reader)
    assert len(rows) > 0, "Expected at least one entity row in CSV export."
    # Check that known entities appear in CSV rows
    entity_names = [row[0].lower() for row in rows]
    assert "testsensorcomponent" in entity_names
    assert "pp_testsignal" in entity_names

    # Test JSON export
    json_resp = await client.get(f"/documents/{doc_id}/extract/export?format=json")
    assert json_resp.status_code == 200
    assert json_resp.headers["content-type"].startswith("application/json")
    assert "attachment;" in json_resp.headers.get("content-disposition", "")

    json_data = json_resp.json()
    assert json_data["document_id"] == doc_id
    assert "generated_at" in json_data
    assert isinstance(json_data["entities"], list)
    assert len(json_data["entities"]) == len(rows)
