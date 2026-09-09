#!/usr/bin/env python3
"""
Automated post-deployment smoke test script for Datum.
Validates live backend health, frontend availability, end-to-end PDF ingestion,
Groq-based grounded Q&A, and document cleanup without relying on local pytest fixtures.

Usage:
  python backend/scripts/smoke_test_deployed.py --backend-url https://datum-api.onrender.com --frontend-url https://datum.vercel.app
  
Or using environment variables:
  export BACKEND_URL=https://datum-api.onrender.com
  export FRONTEND_URL=https://datum.vercel.app
  python backend/scripts/smoke_test_deployed.py
"""

import argparse
import io
import os
import sys
import time
from typing import Optional
from fpdf import FPDF
import httpx


class SmokeTestSpecPDF(FPDF):
    """Synthetic PDF generator with running header for smoke testing."""
    def header(self):
        self.set_font("helvetica", "B", 10)
        self.cell(0, 10, "Datum Smoke Test Specification", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)


def generate_synthetic_smoke_pdf() -> bytes:
    """Generate a lightweight deterministic PDF in memory using fpdf2."""
    pdf = SmokeTestSpecPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "4.1 TestSensorComponent Overview", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        "The TestSensorComponent is a core sensor abstraction component designed for automotive "
        "high-level design testing. It exposes a specialized client-server port called pp_TestSignal "
        "to broadcast digitized sensor readings across the vehicle network. The sensor interface operates "
        "with an execution periodicity of ten milliseconds and guarantees deterministic data delivery "
        "without signal degradation. Internal calibration tables are maintained within non-volatile memory.",
    )
    buf = io.BytesIO(pdf.output())
    return buf.getvalue()


def run_smoke_tests(backend_url: str, frontend_url: str) -> bool:
    backend_url = backend_url.rstrip("/")
    frontend_url = frontend_url.rstrip("/")

    print("=" * 65)
    print("DATUM POST-DEPLOYMENT SMOKE TEST RUNNER")
    print(f"Target Backend : {backend_url}")
    print(f"Target Frontend: {frontend_url}")
    print("=" * 65)

    passed_checks = 0
    total_checks = 5
    created_doc_id: Optional[str] = None

    client = httpx.Client(timeout=30.0, follow_redirects=True)

    try:
        # Check 1: Backend Health Check
        print("\n[1/5] Checking Backend Health (/health)...")
        try:
            health_resp = client.get(f"{backend_url}/health", timeout=15.0)
            if health_resp.status_code != 200:
                print(f"  [FAIL] Expected HTTP 200 from /health, got {health_resp.status_code}")
                return False

            health_data = health_resp.json()
            status = health_data.get("status")
            qdrant_ok = health_data.get("qdrant_connected")
            groq_ok = health_data.get("groq_configured")

            if status != "ok":
                print(f"  [FAIL] Health status is '{status}', expected 'ok'")
                return False
            if not qdrant_ok:
                print("  [FAIL] Qdrant connection check failed (qdrant_connected is False)")
                return False
            if not groq_ok:
                print("  [FAIL] Groq is not configured (groq_configured is False)")
                return False

            print(f"  [PASS] Status: {status}, Qdrant: connected, Groq: configured")
            passed_checks += 1
        except Exception as e:
            print(f"  [FAIL] Unable to reach backend health endpoint: {e}")
            return False

        # Check 2: Frontend Availability & Sanity
        print("\n[2/5] Checking Frontend Availability...")
        try:
            fe_resp = client.get(frontend_url, timeout=15.0)
            if fe_resp.status_code != 200:
                print(f"  [FAIL] Expected HTTP 200 from frontend, got {fe_resp.status_code}")
                return False

            body_text = fe_resp.text
            if "Datum" not in body_text:
                print("  [FAIL] Frontend responded with HTTP 200, but HTML body is missing 'Datum'")
                return False

            print(f"  [PASS] HTTP 200 received and 'Datum' application title confirmed")
            passed_checks += 1
        except Exception as e:
            print(f"  [FAIL] Unable to reach frontend URL: {e}")
            return False

        # Check 3: Upload & Ingest Synthetic PDF
        print("\n[3/5] Ingesting Synthetic PDF Document (/documents/upload)...")
        try:
            pdf_bytes = generate_synthetic_smoke_pdf()
            files = {"file": ("smoke_test_spec.pdf", pdf_bytes, "application/pdf")}
            upload_resp = client.post(f"{backend_url}/documents/upload", files=files, timeout=120.0)

            if upload_resp.status_code != 201:
                print(f"  [FAIL] Expected HTTP 201 from upload, got {upload_resp.status_code}: {upload_resp.text}")
                return False

            upload_data = upload_resp.json()
            created_doc_id = upload_data.get("id")
            doc_status = upload_data.get("status")

            # Poll for readiness if not already ready
            poll_timeout = 90
            poll_start = time.time()
            while doc_status in ("processing", "embedding") and (time.time() - poll_start < poll_timeout):
                print(f"  ... document in '{doc_status}' state, waiting...")
                time.sleep(2.0)
                list_resp = client.get(f"{backend_url}/documents", timeout=15.0)
                if list_resp.status_code == 200:
                    matching = [d for d in list_resp.json() if d["id"] == created_doc_id]
                    if matching:
                        doc_status = matching[0].get("status")

            if doc_status != "ready":
                print(f"  [FAIL] Document failed to reach 'ready' state (current: '{doc_status}')")
                return False

            print(f"  [PASS] Document successfully ingested and ready (id: {created_doc_id})")
            passed_checks += 1
        except Exception as e:
            print(f"  [FAIL] Document upload failed: {e}")
            return False

        # Check 4: Grounded Q&A against Ingested Document
        print("\n[4/5] Executing Grounded Technical Query (/documents/{id}/ask)...")
        try:
            ask_payload = {"question": "What port does TestSensorComponent expose?"}
            ask_resp = client.post(
                f"{backend_url}/documents/{created_doc_id}/ask",
                json=ask_payload,
                timeout=90.0,
            )

            if ask_resp.status_code != 200:
                print(f"  [FAIL] Expected HTTP 200 from /ask, got {ask_resp.status_code}: {ask_resp.text}")
                return False

            ask_data = ask_resp.json()
            answer = ask_data.get("answer", "")
            citations = ask_data.get("citations", [])
            confidence = ask_data.get("confidence")

            if not answer or "pp_testsignal" not in answer.lower():
                print(f"  [FAIL] Answer does not mention expected port 'pp_TestSignal': '{answer}'")
                return False

            if not citations or len(citations) == 0:
                print("  [FAIL] Answer returned without citations")
                return False

            print(f"  [PASS] Grounded answer generated with {len(citations)} citation(s) (confidence: {confidence})")
            passed_checks += 1
        except Exception as e:
            print(f"  [FAIL] Grounded Q&A call failed: {e}")
            return False

        # Check 5: Document Cleanup
        print("\n[5/5] Cleaning up test document (/documents/{id})...")
        try:
            del_resp = client.delete(f"{backend_url}/documents/{created_doc_id}", timeout=15.0)
            if del_resp.status_code != 200:
                print(f"  [FAIL] Expected HTTP 200 from DELETE, got {del_resp.status_code}")
                return False

            # Verify document is gone
            get_chunks = client.get(f"{backend_url}/documents/{created_doc_id}/chunks", timeout=15.0)
            if get_chunks.status_code != 404:
                print(f"  [FAIL] Chunks still accessible after deletion (HTTP {get_chunks.status_code})")
                return False

            created_doc_id = None  # Already cleaned up
            print("  [PASS] Test document and vector records removed cleanly")
            passed_checks += 1
        except Exception as e:
            print(f"  [FAIL] Cleanup call failed: {e}")
            return False

    finally:
        # Fallback cleanup in case of unexpected exception
        if created_doc_id:
            try:
                print(f"\n[CLEANUP] Removing lingering test document {created_doc_id}...")
                client.delete(f"{backend_url}/documents/{created_doc_id}", timeout=10.0)
            except Exception:
                pass
        client.close()

    print("\n" + "=" * 65)
    if passed_checks == total_checks:
        print(f"ALL SMOKE TESTS PASSED ({passed_checks}/{total_checks} checks passed)")
        print("=" * 65)
        return True
    else:
        print(f"SMOKE TESTS FAILED ({passed_checks}/{total_checks} checks passed)")
        print("=" * 65)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Run automated post-deployment smoke test against live Datum backend and frontend."
    )
    parser.add_argument(
        "--backend-url",
        default=os.environ.get("BACKEND_URL", "http://127.0.0.1:8000"),
        help="Base URL of live backend (default: env BACKEND_URL or http://127.0.0.1:8000)",
    )
    parser.add_argument(
        "--frontend-url",
        default=os.environ.get("FRONTEND_URL", "http://127.0.0.1:5173"),
        help="Base URL of live frontend (default: env FRONTEND_URL or http://127.0.0.1:5173)",
    )
    args = parser.parse_args()

    success = run_smoke_tests(backend_url=args.backend_url, frontend_url=args.frontend_url)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
