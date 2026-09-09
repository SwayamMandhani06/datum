#!/usr/bin/env python3
"""
Evaluation Harness for Datum RAG Backend.

Evaluates question answering against AUTOSAR technical specifications:
1. Structural checks (confidence != low, citations non-empty, keyword presence).
2. Factual Groundedness check using LLM-as-Judge (Groq) to independently verify
   that every claim in the answer is supported by the cited excerpts.
3. Outputs comprehensive JSON report and prints plain-text summary table.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from groq import Groq, RateLimitError

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


JUDGE_SYSTEM_PROMPT = """You are an impartial expert evaluator auditing the factual groundedness of an AI assistant's answers against retrieved AUTOSAR specification excerpts.

Your task is to determine whether every single factual statement, constraint, attribute name, and claim made in the GENERATED ANSWER is directly and factually supported by the CITED EXCERPTS provided.

Evaluation Rules:
1. STRICT GROUNDING: Every claim made in the answer MUST be verifiable directly from the provided cited excerpts.
2. FORBID OUTSIDE KNOWLEDGE: Even if a fact is true in automotive engineering or the AUTOSAR standard in general, if it is NOT present in the cited excerpts, it is considered UNGROUNDED.
3. INFERENCES: Direct paraphrasing and syntactical rephrasing of the text in the excerpts are acceptable. Speculative leaps, extrapolations, or details not found in the excerpts are NOT acceptable.
4. If ANY claim in the answer is not supported by the cited excerpts, output "grounded": false.
5. If all claims in the answer are supported by the excerpts, output "grounded": true.

Output strict JSON with exact keys:
{
  "grounded": true or false,
  "reasoning": "Clear concise explanation of why the answer is or is not grounded in the excerpts"
}
"""


def get_groq_judge_client() -> Tuple[Groq, str]:
    """Initialize Groq client using environment variable or .env file."""
    api_key = os.environ.get("GROQ_API_KEY")
    model = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")

    if not api_key:
        env_path = Path(__file__).resolve().parent.parent / ".env"
        if env_path.is_file():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GROQ_API_KEY=") and not api_key:
                        api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("GROQ_MODEL=") and "GROQ_MODEL" not in os.environ:
                        model = line.split("=", 1)[1].strip().strip('"').strip("'")

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY not found in environment or backend/.env. "
            "Evaluation requires a Groq API key for LLM-as-judge groundedness checks."
        )

    return Groq(api_key=api_key), model


def find_sample_file(filename: str, project_root: Path) -> Optional[Path]:
    """Search for the sample PDF in eval/samples or backend/uploads."""
    candidates = [
        project_root / "backend" / "eval" / "samples" / filename,
        project_root / "eval" / "samples" / filename,
        project_root / "backend" / "uploads" / filename,
    ]
    for c in candidates:
        if c.is_file():
            return c

    # Check for uuid-prefixed files in uploads/
    uploads_dir = project_root / "backend" / "uploads"
    if uploads_dir.is_dir():
        for f in uploads_dir.glob(f"*_{filename}"):
            if f.is_file():
                return f

    return None


def resolve_or_upload_document(
    client: httpx.Client,
    backend_url: str,
    filename: str,
    project_root: Path,
) -> str:
    """Find document by filename on backend; upload from local disk if missing."""
    resp = client.get(f"{backend_url}/documents")
    resp.raise_for_status()
    docs = resp.json()

    for doc in docs:
        if doc.get("filename") == filename and doc.get("status") == "ready":
            return doc["id"]

    sample_path = find_sample_file(filename, project_root)
    if not sample_path or not sample_path.is_file():
        raise FileNotFoundError(
            f"Document '{filename}' not found on backend, and local sample file could not be located."
        )

    print(f"  -> Uploading '{filename}' to target environment ({sample_path.name})...", flush=True)
    with open(sample_path, "rb") as f:
        up_resp = client.post(
            f"{backend_url}/documents/upload",
            files={"file": (filename, f, "application/pdf")},
            timeout=180.0,
        )
    up_resp.raise_for_status()
    doc_data = up_resp.json()
    doc_id = doc_data["id"]

    # Poll status until ready (timeout 180s)
    deadline = time.time() + 180
    while time.time() < deadline:
        poll_resp = client.get(f"{backend_url}/documents")
        if poll_resp.status_code == 200:
            for d in poll_resp.json():
                if d["id"] == doc_id:
                    if d["status"] == "ready":
                        print(f"  -> Document '{filename}' is ready (id: {doc_id}).", flush=True)
                        return doc_id
                    elif d["status"] == "failed":
                        raise RuntimeError(
                            f"Document upload failed: {d.get('error_message')}"
                        )
        time.sleep(2.0)

    raise TimeoutError(f"Timed out waiting for '{filename}' ingestion to complete.")


def evaluate_groundedness_llm(
    judge_client: Groq,
    model: str,
    question: str,
    answer: str,
    citations: List[Dict[str, Any]],
    retries: int = 3,
) -> Tuple[bool, str]:
    """Call Groq LLM as judge to assess factual groundedness against cited excerpts."""
    excerpts_formatted = []
    for c in citations:
        marker = c.get("marker", "?")
        title = c.get("section_title") or "Section"
        text = c.get("excerpt") or ""
        excerpts_formatted.append(f"[{marker}] ({title}):\n{text.strip()}")

    user_prompt = (
        f"QUESTION: {question}\n\n"
        f"GENERATED ANSWER:\n{answer}\n\n"
        f"CITED EXCERPTS:\n" + "\n\n".join(excerpts_formatted)
    )

    for attempt in range(retries + 1):
        try:
            response = judge_client.chat.completions.create(
                model=model,
                temperature=0.0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)
            grounded = bool(parsed.get("grounded", False))
            reasoning = str(parsed.get("reasoning", "")).strip()
            return grounded, reasoning
        except RateLimitError as e:
            if attempt < retries:
                backoff = 3.0 * (attempt + 1)
                print(f"    [Judge Rate Limit 429] Retrying in {backoff:.1f}s...", flush=True)
                time.sleep(backoff)
                continue
            return False, f"LLM judge rate limit exceeded: {str(e)}"
        except Exception as e:
            return False, f"LLM-as-judge evaluation error: {str(e)}"

    return False, "LLM judge failed after retries."


def run_evaluation(
    backend_url: str,
    questions_path: Path,
    output_dir: Path,
) -> int:
    """Run evaluation suite and generate reports."""
    print("=" * 80, flush=True)
    print(" " * 26 + "DATUM EVALUATION HARNESS", flush=True)
    print("=" * 80, flush=True)
    print(f"Target Backend: {backend_url}", flush=True)
    print(f"Question Set:   {questions_path}", flush=True)

    with open(questions_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    project_root = questions_path.resolve().parent.parent.parent
    judge_client, judge_model = get_groq_judge_client()
    print(f"LLM Judge:      Groq ({judge_model})", flush=True)
    print(f"Questions:      {len(questions)} items", flush=True)
    print("-" * 80, flush=True)

    http_client = httpx.Client(timeout=90.0)

    # Pre-resolve all unique documents
    doc_id_map: Dict[str, str] = {}
    unique_filenames = sorted(list({q["document_filename"] for q in questions}))
    print("\n[Phase 1/3] Resolving documents in target environment...", flush=True)
    for fn in unique_filenames:
        print(f"Checking '{fn}'...", flush=True)
        doc_id = resolve_or_upload_document(http_client, backend_url, fn, project_root)
        doc_id_map[fn] = doc_id

    print("\n[Phase 2/3] Running structural & groundedness evaluations...", flush=True)
    eval_results: List[Dict[str, Any]] = []

    for idx, item in enumerate(questions, 1):
        fn = item["document_filename"]
        q_text = item["question"]
        expect_ans = item["expect_answerable"]
        exp_keywords = item.get("expected_keywords", [])
        doc_id = doc_id_map[fn]

        print(f"\n[{idx}/{len(questions)}] Question: {q_text}", flush=True)
        print(f"  Doc: {fn} | Answerable: {expect_ans}", flush=True)

        # Call /ask with retry on 503/429
        res_data = None
        for ask_attempt in range(5):
            try:
                ask_resp = http_client.post(
                    f"{backend_url}/documents/{doc_id}/ask",
                    json={"question": q_text},
                    timeout=90.0,
                )
                if ask_resp.status_code in (429, 503):
                    backoff = 5.0 * (ask_attempt + 1)
                    print(f"  [/ask RateLimit {ask_resp.status_code}] Retrying in {backoff:.1f}s...", flush=True)
                    time.sleep(backoff)
                    continue
                ask_resp.raise_for_status()
                res_data = ask_resp.json()
                break
            except Exception as e:
                if ask_attempt == 4:
                    print(f"  [ERROR] /ask endpoint call failed: {e}", flush=True)
                    break
                backoff = 4.0 * (ask_attempt + 1)
                time.sleep(backoff)

        if res_data is None:
            eval_results.append({
                "index": idx,
                "document_filename": fn,
                "question": q_text,
                "expect_answerable": expect_ans,
                "expected_keywords": exp_keywords,
                "answer": "",
                "confidence": "error",
                "citations": [],
                "structural_pass": False,
                "structural_failure_reason": "API request failed after retries.",
                "grounded_pass": False,
                "judge_reasoning": "Skipped due to API request failure.",
            })
            continue

        answer = res_data.get("answer", "")
        citations = res_data.get("citations", [])
        confidence = res_data.get("confidence", "low")

        # 1. Structural Checks
        structural_pass = True
        structural_failures: List[str] = []

        if expect_ans:
            if confidence == "low":
                structural_pass = False
                structural_failures.append("Confidence was 'low' for answerable question")
            if not citations:
                structural_pass = False
                structural_failures.append("No citations returned for answerable question")
            # Normalize hyphens and dashes (e.g. non-breaking hyphen \u2011 -> -) for robust keyword matching
            norm_ans = (
                answer.lower()
                .replace("\u2011", "-")
                .replace("\u2013", "-")
                .replace("\u2014", "-")
            )
            missing_kw = [
                kw for kw in exp_keywords
                if kw.lower().replace("\u2011", "-").replace("\u2013", "-") not in norm_ans
            ]
            if missing_kw:
                structural_pass = False
                structural_failures.append(f"Missing expected keywords: {missing_kw}")
        else:
            if confidence != "low":
                structural_pass = False
                structural_failures.append(f"Expected confidence 'low' but got '{confidence}'")
            if citations:
                structural_pass = False
                structural_failures.append(f"Expected 0 citations for out-of-scope question but got {len(citations)}")

        # 2. Groundedness Check (LLM-as-judge)
        if expect_ans:
            if citations:
                grounded_pass, judge_reasoning = evaluate_groundedness_llm(
                    judge_client=judge_client,
                    model=judge_model,
                    question=q_text,
                    answer=answer,
                    citations=citations,
                )
            else:
                grounded_pass = False
                judge_reasoning = "No citations provided to substantiate answer."
        else:
            # Unanswerable question: if system correctly refused without inventing facts, it is grounded
            if structural_pass:
                grounded_pass = True
                judge_reasoning = "Correctly refused to answer out-of-scope question without fabricating claims."
            else:
                grounded_pass = False
                judge_reasoning = "Failed to properly refuse out-of-scope question; claims or citations were generated."

        struct_status = "PASS" if structural_pass else "FAIL"
        ground_status = "PASS" if grounded_pass else "FAIL"
        print(f"  Structural: [{struct_status}] | Groundedness: [{ground_status}]", flush=True)
        if not structural_pass:
            print(f"  Reason: {'; '.join(structural_failures)}", flush=True)
        if not grounded_pass and expect_ans:
            print(f"  Judge: {judge_reasoning}", flush=True)

        eval_results.append({
            "index": idx,
            "document_filename": fn,
            "question": q_text,
            "expect_answerable": expect_ans,
            "expected_keywords": exp_keywords,
            "answer": answer,
            "confidence": confidence,
            "citations": citations,
            "structural_pass": structural_pass,
            "structural_failure_reason": "; ".join(structural_failures) if structural_failures else None,
            "grounded_pass": grounded_pass,
            "judge_reasoning": judge_reasoning,
        })

        # Pacing to remain well within Groq rate limits
        time.sleep(3.0)

    # Output reports
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_file = output_dir / f"eval_report_{timestamp}.json"

    total_q = len(eval_results)
    struct_passed = sum(1 for r in eval_results if r["structural_pass"])
    ground_passed = sum(1 for r in eval_results if r["grounded_pass"])

    struct_rate = (struct_passed / total_q) * 100 if total_q else 0.0
    ground_rate = (ground_passed / total_q) * 100 if total_q else 0.0

    report_payload = {
        "timestamp": timestamp,
        "backend_url": backend_url,
        "judge_model": judge_model,
        "total_questions": total_q,
        "structural_pass_count": struct_passed,
        "structural_pass_rate_pct": round(struct_rate, 2),
        "groundedness_pass_count": ground_passed,
        "groundedness_pass_rate_pct": round(ground_rate, 2),
        "results": eval_results,
    }

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    # Print clean plain-text summary table
    print("\n" + "=" * 80, flush=True)
    print(" " * 31 + "EVALUATION SUMMARY", flush=True)
    print("=" * 80, flush=True)
    print(f"Total Questions Evaluated:  {total_q}", flush=True)
    print(f"Structural Pass Rate:       {struct_passed}/{total_q} ({struct_rate:.1f}%)", flush=True)
    print(f"Groundedness Pass Rate:     {ground_passed}/{total_q} ({ground_rate:.1f}%)", flush=True)
    print(f"Full Report Saved To:       {report_file}", flush=True)
    print("-" * 80, flush=True)

    # Tabular summary
    print(f"{'#':<3} | {'Type':<10} | {'Struct':<8} | {'Grounded':<8} | {'Question':<45}", flush=True)
    print("-" * 80, flush=True)
    failing_items = []
    for r in eval_results:
        q_type = "In-Scope" if r["expect_answerable"] else "Out-Scope"
        s_res = "PASS" if r["structural_pass"] else "FAIL"
        g_res = "PASS" if r["grounded_pass"] else "FAIL"
        short_q = r["question"][:42] + "..." if len(r["question"]) > 45 else r["question"]
        print(f"{r['index']:<3} | {q_type:<10} | {s_res:<8} | {g_res:<8} | {short_q:<45}", flush=True)

        if not r["structural_pass"] or not r["grounded_pass"]:
            failing_items.append(r)

    print("-" * 80, flush=True)
    if failing_items:
        print("\nFAILING QUESTIONS DIAGNOSTICS:", flush=True)
        for f in failing_items:
            reasons = []
            if not f["structural_pass"]:
                reasons.append(f"Structural: {f['structural_failure_reason']}")
            if not f["grounded_pass"]:
                reasons.append(f"Judge: {f['judge_reasoning']}")
            print(f"  * Q{f['index']} (\"{f['question']}\"): {' | '.join(reasons)}", flush=True)
        print("=" * 80, flush=True)
        return 1
    else:
        print("\nAll evaluation checks PASSED successfully! No hallucination or structural violations detected.", flush=True)
        print("=" * 80, flush=True)
        return 0


def main():
    parser = argparse.ArgumentParser(description="Automated Evaluation Harness for Datum Backend")
    parser.add_argument(
        "--backend-url",
        default=os.environ.get("BACKEND_URL", "http://127.0.0.1:8000"),
        help="Base URL of the Datum backend API (default: http://127.0.0.1:8000)",
    )
    default_questions = Path(__file__).resolve().parent.parent / "eval" / "questions.json"
    parser.add_argument(
        "--questions",
        default=str(default_questions),
        help=f"Path to questions JSON file (default: {default_questions})",
    )
    default_output = Path(__file__).resolve().parent.parent / "eval" / "results"
    parser.add_argument(
        "--output-dir",
        default=str(default_output),
        help=f"Directory to save evaluation reports (default: {default_output})",
    )

    args = parser.parse_args()
    questions_path = Path(args.questions)
    output_dir = Path(args.output_dir)

    if not questions_path.is_file():
        print(f"Error: Questions file not found at {questions_path}", file=sys.stderr, flush=True)
        sys.exit(1)

    exit_code = run_evaluation(
        backend_url=args.backend_url.rstrip("/"),
        questions_path=questions_path,
        output_dir=output_dir,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
