import os
import sys
from pathlib import Path
import pymupdf

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.parsing import parse_pdf
from app.chunking import build_chunks_from_blocks
from app.main import app
from starlette.testclient import TestClient


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
    # Heading 1 (Large Bold)
    page2.insert_text((50, 60), "4 Software Component Types", fontsize=16, fontname="helv")
    # Intro (< 100 words)
    intro_p2 = (
        "Software components are the fundamental architectural building blocks of "
        "an AUTOSAR application. They encapsulate specific functional algorithms."
    )
    page2.insert_text((50, 90), intro_p2, fontsize=10, fontname="helv")

    # Heading 2 (Medium Bold)
    page2.insert_text((50, 130), "4.1 Sensor-Actuator Component Type", fontsize=13, fontname="helv")

    # Generate a long text paragraph (> 500 words) to verify splitting with overlap
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

    # Check that headings were detected
    heading_titles = [b.heading_title for b in blocks if b.heading_title]
    print(f"[OK] Detected heading titles: {set(heading_titles)}")
    assert any("4 Software Component" in h for h in heading_titles if h), "Heading 4 not detected"
    assert any("4.1" in h for h in heading_titles if h), "Heading 4.1 not detected"
    assert any("4.2" in h for h in heading_titles if h), "Heading 4.2 not detected"
    assert any("5 Diagnostic" in h for h in heading_titles if h), "Heading 5 not detected"

    # 2. Test chunking.py directly
    chunks = build_chunks_from_blocks(blocks)
    print(f"[OK] build_chunks_from_blocks produced {len(chunks)} chunks.")
    assert len(chunks) >= 3, f"Expected at least 3 chunks, got {len(chunks)}"

    for c in chunks:
        print(
            f"   Chunk {c.chunk_index}: Title='{c.section_title}' Pages={c.page_start}-{c.page_end} Words={c.word_count}"
        )
        assert c.word_count > 0, "Chunk word count must be positive"
        assert c.page_start <= c.page_end, "page_start must be <= page_end"

    # 3. Test FastAPI endpoints using TestClient
    with TestClient(app) as client:
        # Health check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[OK] GET /health returned 200")

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
        print(f"[OK] POST /documents/upload succeeded: doc_id={doc_id}, chunk_count={data['chunk_count']}")

        # List documents
        res = client.get("/documents")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        docs = res.json()
        assert any(d["id"] == doc_id for d in docs), "Uploaded document not in list"
        print(f"[OK] GET /documents returned {len(docs)} documents.")

        # Get chunks for document
        res = client.get(f"/documents/{doc_id}/chunks")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        doc_chunks = res.json()
        assert len(doc_chunks) == data["chunk_count"], "Chunk count mismatch in GET /chunks"
        print(f"[OK] GET /documents/{doc_id}/chunks returned {len(doc_chunks)} chunks.")

        # Delete document
        res = client.delete(f"/documents/{doc_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print(f"[OK] DELETE /documents/{doc_id} returned 200")

        # Confirm deleted
        res = client.get(f"/documents/{doc_id}/chunks")
        assert res.status_code == 404, f"Expected 404 after deletion, got {res.status_code}"
        print("[OK] GET /documents/{doc_id}/chunks correctly returned 404 after deletion.")

    # Cleanup sample file
    if os.path.exists(test_pdf_path):
        os.remove(test_pdf_path)

    print("\nALL INGESTION AND CHUNKING PIPELINE TESTS PASSED!")


if __name__ == "__main__":
    run_tests()
