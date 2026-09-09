import logging
import re
import time
from typing import List, Dict, Any, Tuple, Optional
from fastapi import HTTPException, status
from groq import Groq, RateLimitError, APIStatusError, APIConnectionError
from app.database import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger("datum.generation")

_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    """Initialize or return the singleton Groq client."""
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GROQ_API_KEY is not configured on the server. Please add your Groq API key to .env.",
            )
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """You are Datum, an expert automotive engineering assistant specialized in AUTOSAR High-Level Design (HLD) specifications.

Strict Grounding Rules:
1. Answer the user's question using ONLY the factual statements contained in the provided numbered sources.
2. You are EXPLICITLY FORBIDDEN from using outside knowledge, assumptions, or general domain conventions about AUTOSAR, automotive software, or ECU architecture beyond what is stated directly in the sources.
3. Every factual claim, interface name, port prototype, timing value, or structural requirement you state MUST be immediately cited with its corresponding bracket marker, e.g. [1] or [2].
4. Use ONLY marker numbers that exist in the provided sources. NEVER invent marker numbers or cite sources not provided.
5. If the provided sources do not contain enough information to answer the question, state plainly and directly: "The provided document does not contain information about this." Do NOT speculate or attempt to answer from outside knowledge.
6. Write in direct, technical prose matching an engineering peer review. Avoid bullet-point lists unless the question explicitly asks for a list or enumeration."""


INSUFFICIENT_INFO_PHRASES = [
    "does not contain information",
    "does not contain any information",
    "does not mention",
    "cannot find",
    "could not find",
    "not specified in the provided",
    "not mentioned in the provided",
    "no information provided",
    "not enough information",
    "is not described in the provided",
    "provided document does not contain",
]


def format_sources_prompt(sources: List[Dict[str, Any]]) -> str:
    """Format retrieved document chunks as numbered reference sources."""
    formatted_chunks = []
    for s in sources:
        marker = s["marker"]
        title = s.get("section_title") or "General Specification"
        p_start = s["page_start"]
        p_end = s["page_end"]
        page_str = f"Page {p_start}" if p_start == p_end else f"Pages {p_start}-{p_end}"
        text = s["text"].strip()
        formatted_chunks.append(f"[{marker}] (Section {title}, {page_str}):\n{text}")
    return "\n\n".join(formatted_chunks)


def generate_answer(question: str, sources: List[Dict[str, Any]]) -> str:
    """
    Call Groq completions API with strict source grounding, low temperature (0.1),
    and retry-with-backoff for HTTP 429 rate limit responses.
    """
    client = get_groq_client()

    sources_text = format_sources_prompt(sources)
    user_prompt = f"Sources:\n{sources_text}\n\nQuestion: {question.strip()}\nAnswer:"

    retries = 2
    for attempt in range(retries + 1):
        try:
            logger.info(
                f"Calling Groq ({GROQ_MODEL}) with {len(sources)} sources (attempt {attempt + 1})..."
            )
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw_text = response.choices[0].message.content or ""
            return raw_text.strip()

        except RateLimitError as e:
            if attempt < retries:
                backoff_sec = 2.0 * (attempt + 1)
                logger.warning(
                    f"Groq rate limit encountered (429). Retrying in {backoff_sec:.1f}s..."
                )
                time.sleep(backoff_sec)
                continue
            logger.error("Groq rate limit exceeded after maximum retries.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Groq API rate limit reached. Please wait a moment before trying again.",
            ) from e

        except APIConnectionError as e:
            logger.error(f"Failed to connect to Groq API: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to connect to the Groq inference service: {str(e)}",
            ) from e

        except APIStatusError as e:
            logger.error(f"Groq API error ({e.status_code}): {e.message}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Groq inference error: {e.message}",
            ) from e

        except Exception as e:
            logger.error(f"Unexpected error during Groq answer generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Answer generation failed: {str(e)}",
            ) from e

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Answer generation failed after retries.",
    )


def validate_citations(
    raw_answer: str, sources: List[Dict[str, Any]]
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extract all bracket markers [N] from the answer.
    Strips any invented markers not in sources from the answer text.
    Builds and returns (cleaned_answer, citations_list) containing only valid, actually-used citations.
    """
    valid_map = {s["marker"]: s for s in sources}

    # 1. Strip ungrounded/invented markers (e.g. [99] when only [1] and [2] exist)
    def sanitize_marker(match):
        marker_num = int(match.group(1))
        if marker_num in valid_map:
            return match.group(0)
        # Strip invented marker tag
        return ""

    cleaned_answer = re.sub(r"\[(\d+)\]", sanitize_marker, raw_answer)
    # Clean up any duplicate spacing left by stripped tags
    cleaned_answer = re.sub(r"[ \t]+", " ", cleaned_answer)
    cleaned_answer = re.sub(r" \.", ".", cleaned_answer).strip()

    # 2. Extract unique valid markers in order of appearance
    used_marker_nums = []
    seen = set()
    for m in re.findall(r"\[(\d+)\]", cleaned_answer):
        num = int(m)
        if num in valid_map and num not in seen:
            seen.add(num)
            used_marker_nums.append(num)

    # Sort citations numerically by marker
    used_marker_nums.sort()

    citations = []
    for m_num in used_marker_nums:
        s = valid_map[m_num]
        citations.append(
            {
                "marker": s["marker"],
                "chunk_id": s["chunk_id"],
                "section_title": s.get("section_title"),
                "page_start": s["page_start"],
                "page_end": s["page_end"],
                "excerpt": s["text"],
            }
        )

    return cleaned_answer, citations


def evaluate_confidence(top_retrieval_score: float, answer: str) -> Tuple[str, Optional[str]]:
    """
    Determine confidence as 'low' if:
    - top retrieval similarity score is < 0.5, OR
    - answer contains phrases indicating insufficient information.
    Otherwise 'high'.
    """
    lower_ans = answer.lower()
    insufficient_found = any(phrase in lower_ans for phrase in INSUFFICIENT_INFO_PHRASES)

    if top_retrieval_score < 0.5 and insufficient_found:
        return (
            "low",
            "The retrieved sections had low relevance to this question and the document does not contain sufficient details.",
        )
    elif top_retrieval_score < 0.5:
        return (
            "low",
            "The retrieved document sections had low semantic relevance to this question.",
        )
    elif insufficient_found:
        return (
            "low",
            "The document does not appear to contain sufficient information to answer this question completely.",
        )
    else:
        return "high", None
