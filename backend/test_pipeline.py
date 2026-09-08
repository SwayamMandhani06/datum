import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Configure in-memory Qdrant and test collection for automated testing
os.environ["QDRANT_URL"] = ":memory:"
os.environ["QDRANT_COLLECTION"] = "test_datum_chunks"

import pymupdf
from starlette.testclient import TestClient
from app.parsing import parse_pdf
from app.chunking import build_chunks_from_blocks
from app.embeddings import embed_texts, embed_query
from app.vectorstore import search as vector_search
from app.main import app


def create_sample_autosar_pdf(filepath: str):
    """Generate a realistic synthetic multi-page AUTOSAR PDF using PyMuPDF."""
    doc = pymupdf.open()

    # --- Page 1: Unheaded preface text ---
    page1 = doc.new_page()
    preface_text = (
        "AUTOSAR Classic Platform Software Component Template Specification. "
        "This document describes the structural and behavioral architecture of software "
        "components within the AUTOSAR standard. It defines interface contracts, "
        "port prototypes, and runnable entity scheduling rules for automotive ECUs."
    )
    page1.insert_text((50, 80), preface_text, fontsize=10, fontname="helv")

    # --- Page 2: Section 4 (Heading 1) and Subsection 4.1 (Heading 2) with >500 words ---
    page2 = doc.new_page()
    page2.insert_text((50, 60), "4 Software Component Types", fontsize=16, fontname="helv")
    intro_p2 = (
        "Software components are the fundamental architectural building blocks of "
        "an AUTOSAR application. They encapsulate specific functional algorithms."
    )
    page2.insert_text((50, 90), intro_p2, fontsize=10, fontname="helv")

    page2.insert_text((50, 130), "4.1 Sensor-Actuator Component Type", fontsize=13, fontname="helv")
    base_sentence = (
        "A SensorActuatorSoftwareComponentType represents an abstraction of a physical sensor or actuator device. "
        "The component interacts with hardware abstraction layers through standardized AUTOSAR port prototypes. "
        "Data communication conforms strictly to SenderReceiverInterface definitions specifying exact data types, "
        "measurement units, physical resolution, and valid numerical ranges. "
        "Runnables configured within this component execute periodically under control of the Basic Software OS scheduler. "
    )
    long_text = " ".join([base_sentence for _ in range(12)])
    rect = pymupdf.Rect(50, 150, 550, 750)
    page2.insert_textbox(rect, long_text, fontsize=10, fontname="helv")

    # --- Page 3: Subsection 4.2 with ~350 words ---
    page3 = doc.new_page()
    page3.insert_text((50, 60), "4.2 Engine Speed Sensor Specification", fontsize=13, fontname="helv")
    sec42_sentence = (
        "The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing "
        "SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm. "
        "Data element EngineSpeed_Rpm is typed as uint16 with resolution 0.25 rpm and physical range 0 to 8000 rpm. "
        "Transmission mode is configured as periodic with a cycle time of 10 milliseconds. "
        "Diagnostic interrogation is supported via PRPortPrototype pr_SensorDiagnostics implementing ClientServerInterface. "
    )
    sec42_text = " ".join([sec42_sentence for _ in range(6)])  # ~330 words
    rect3 = pymupdf.Rect(50, 80, 550, 700)
    page3.insert_textbox(rect3, sec42_text, fontsize=10, fontname="helv")

    # --- Page 4: Section 5 (Heading 1) starting new top-level topic ---
    page4 = doc.new_page()
    page4.insert_text((50, 60), "5 Diagnostic Protocols and Fault Memory", fontsize=16, fontname="helv")
    sec5_text = (
        "The diagnostic subsystem provides standard services for reading fault memory, "
        "clearing diagnostic trouble codes (DTCs), and querying sensor operating metrics. "
        "All diagnostic routines conform to UDS ISO 14229 specifications."
    )
    page4.insert_text((50, 90), sec5_text, fontsize=10, fontname="helv")

    doc.save(filepath)
    doc.close()


def run_tests():
    test_pdf_path = "sample_test_doc.pdf"
    create_sample_autosar_pdf(test_pdf_path)
    print(f"[OK] Generated synthetic test PDF: {test_pdf_path}")

    # 1. Test parsing.py directly
    page_count, blocks = parse_pdf(test_pdf_path)
    print(f"[OK] parse_pdf extracted {page_count} pages and {len(blocks)} blocks.")
    assert page_count == 4, f"Expected 4 pages, got {page_count}"
    assert len(blocks) > 0, "Expected non-empty blocks"

    # 2. Test chunking.py directly
    chunks = build_chunks_from_blocks(blocks)
    print(f"[OK] build_chunks_from_blocks produced {len(chunks)} chunks.")
    assert len(chunks) >= 3, f"Expected at least 3 chunks, got {len(chunks)}"

    # 3. Test embeddings.py directly (batch embedding and asymmetric query)
    sample_texts = [
        "Software components interact via AUTOSAR port prototypes.",
        "EngineSpeedSensor provides EngineSpeed_Rpm with 0.25 rpm resolution.",
    ]
    vecs = embed_texts(sample_texts, batch_size=2)
    print(f"[OK] embed_texts embedded {len(vecs)} passages. Dimension: {len(vecs[0])}")
    assert len(vecs) == 2, "Expected 2 embeddings"
    assert len(vecs[0]) == 384, f"Expected dimension 384, got {len(vecs[0])}"

    query_vec = embed_query("What port prototype is configured for EngineSpeed?")
    print(f"[OK] embed_query embedded query with BGE prefix. Dimension: {len(query_vec)}")
    assert len(query_vec) == 384, f"Expected dimension 384, got {len(query_vec)}"

    # 4. Test Qdrant payload index initialization & idempotency
    from unittest.mock import MagicMock
    from qdrant_client import QdrantClient
    from qdrant_client.models import PayloadSchemaType
    from app.vectorstore import ensure_payload_indexes, ensure_collection, get_qdrant_client

    mock_client = MagicMock(spec=QdrantClient)
    mock_client.get_collections.return_value.collections = [MagicMock(name="test_datum_chunks")]
    mock_client.get_collection.return_value.payload_schema = {}

    # Verify index is created when missing
    ensure_payload_indexes(mock_client)
    mock_client.create_payload_index.assert_called_once_with(
        collection_name="test_datum_chunks",
        field_name="document_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print("[OK] ensure_payload_indexes created missing 'document_id' keyword index.")

    # Verify idempotency when index already exists
    mock_client.reset_mock()
    mock_client.get_collection.return_value.payload_schema = {"document_id": MagicMock()}
    ensure_payload_indexes(mock_client)
    mock_client.create_payload_index.assert_not_called()
    print("[OK] ensure_payload_indexes is idempotent when 'document_id' index already exists.")

    # Verify real in-memory Qdrant client executes ensure_collection without error
    real_client = get_qdrant_client()
    ensure_collection(real_client)
    print("[OK] Real Qdrant client executed ensure_collection and ensure_payload_indexes.")

    # 5. Test FastAPI endpoints and vector search with TestClient
    with TestClient(app) as client:
        # Health check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        assert res.json()["phase"] == "retrieval-and-embeddings"
        print("[OK] GET /health returned 200 (retrieval-and-embeddings)")

        # Upload non-PDF (should fail with 400)
        res = client.post(
            "/documents/upload",
            files={"file": ("test.txt", b"Hello world", "text/plain")},
        )
        assert res.status_code == 400, f"Expected 400 for non-PDF, got {res.status_code}"
        print("[OK] POST /documents/upload rejected non-PDF with 400")

        # Upload valid PDF
        with open(test_pdf_path, "rb") as f:
            res = client.post(
                "/documents/upload",
                files={"file": ("sample_test_doc.pdf", f, "application/pdf")},
            )
        assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
        data = res.json()
        doc_id = data["id"]
        assert data["status"] == "ready", f"Expected status ready, got {data['status']}"
        assert data["page_count"] == 4, f"Expected 4 pages, got {data['page_count']}"
        assert data["chunk_count"] > 0, "Expected chunks > 0"
        print(f"[OK] POST /documents/upload completed with status 'ready': doc_id={doc_id}, chunks={data['chunk_count']}")

        # List documents
        res = client.get("/documents")
        assert res.status_code == 200
        docs = res.json()
        assert any(d["id"] == doc_id for d in docs)
        print(f"[OK] GET /documents confirmed document {doc_id} exists.")

        # Test POST /documents/{id}/search for Engine Speed query
        search_res = client.post(
            f"/documents/{doc_id}/search",
            json={"query": "EngineSpeedSensor SenderReceiverInterface If_EngineSpeed", "top_k": 3},
        )
        assert search_res.status_code == 200, f"Search failed: {search_res.text}"
        search_data = search_res.json()
        results = search_data.get("results", [])
        assert len(results) > 0, "Expected search results"
        top_match = results[0]
        print(f"[OK] Search top match: Title='{top_match['section_title']}' Score={top_match['score']:.4f}")
        assert "Engine Speed" in (top_match["section_title"] or "") or "pp_EngineSpeed" in top_match["text"], (
            "Top result did not match expected section"
        )
        assert top_match["score"] > 0.5, f"Expected similarity score > 0.5, got {top_match['score']}"

        # Test POST /documents/{id}/search for Diagnostics query
        diag_res = client.post(
            f"/documents/{doc_id}/search",
            json={"query": "diagnostic fault memory UDS ISO 14229", "top_k": 2},
        )
        assert diag_res.status_code == 200
        diag_results = diag_res.json().get("results", [])
        assert len(diag_results) > 0
        print(f"[OK] Diagnostic search top match: Title='{diag_results[0]['section_title']}' Score={diag_results[0]['score']:.4f}")
        assert "Diagnostic" in (diag_results[0]["section_title"] or "") or "UDS" in diag_results[0]["text"]

        # Search non-existent document
        bad_search = client.post(
            "/documents/00000000-0000-0000-0000-000000000000/search",
            json={"query": "AUTOSAR", "top_k": 1},
        )
        assert bad_search.status_code == 404, "Expected 404 for missing document search"
        print("[OK] POST /documents/{id}/search returned 404 for unknown document ID")

        # Delete document (including Qdrant vectors)
        del_res = client.delete(f"/documents/{doc_id}")
        assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
        print(f"[OK] DELETE /documents/{doc_id} returned 200")

        # Confirm chunks and search now 404
        assert client.get(f"/documents/{doc_id}/chunks").status_code == 404
        assert client.post(f"/documents/{doc_id}/search", json={"query": "test"}).status_code == 404
        print("[OK] Deleted document confirmed 404 on both GET chunks and POST search.")

    # Cleanup sample file
    if os.path.exists(test_pdf_path):
        os.remove(test_pdf_path)

    print("\nALL INGESTION, EMBEDDINGS, AND VECTOR SEARCH TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
