import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from groq import Groq, RateLimitError, APIStatusError, APIConnectionError
from app.database import get_db, GROQ_MODEL
from app.generation import get_groq_client
from app.models import ExtractedEntity, ExtractionResult

logger = logging.getLogger("datum.extraction")

EXTRACTION_SYSTEM_PROMPT = """You are Datum, an expert automotive architecture extraction assistant specialized in AUTOSAR specifications.

Task:
Extract technical entities (components, ports, interfaces, signals) that are EXPLICITLY named in the provided document text chunks.

Strict Extraction & Grounding Rules:
1. Extract ONLY entities that are explicitly and literally named in the text.
2. You are STRICTLY FORBIDDEN from inventing, inferring, or hallucinating entities, ports, or signals that do not literally appear in the provided text.
3. Classify each entity into one of these exact entity_type categories:
   - "component": Software components, hardware modules, abstraction layers (e.g. TestSensorComponent, TestActuatorComponent, EcuM)
   - "port": Explicitly designated ports (e.g. pp_TestSignal, pp_ActuatorCommand, rp_SensorData)
   - "interface": Communication interfaces, client-server or sender-receiver interfaces
   - "signal": Discrete data signals, bus signals, or messages
   - "other": Other architectural hardware/software technical entities explicitly defined
4. Provide a concise factual description (1-2 sentences) derived strictly from the text.
5. Specify the source_chunk_id from the header of the chunk where the entity is introduced.
6. Return a valid JSON object matching this schema:
{
  "entities": [
    {
      "name": "<exact entity name as written in text>",
      "entity_type": "component" | "port" | "interface" | "signal" | "other",
      "description": "<concise factual description>",
      "source_chunk_id": "<chunk_id>"
    }
  ]
}
If no technical entities are explicitly named in the provided text, return {"entities": []}.
Output ONLY the JSON object. Do not include markdown blocks, introductory text, or concluding notes."""


def format_batch_text(chunks: List[Dict[str, Any]]) -> str:
    """Format a batch of chunks with clear boundary markers and chunk IDs."""
    sections = []
    for c in chunks:
        title = c.get("section_title") or "General Specification"
        p_start = c.get("page_start", 1)
        p_end = c.get("page_end", 1)
        pages_str = f"Page {p_start}" if p_start == p_end else f"Pages {p_start}-{p_end}"
        chunk_id = c["id"]
        text = c.get("text", "").strip()
        sections.append(
            f"=== CHUNK ID: {chunk_id} | Section: {title} | {pages_str} ===\n{text}"
        )
    return "\n\n".join(sections)


def call_groq_extraction(batch_text: str, retry_strict: bool = False, max_retries: int = 3) -> Optional[List[Dict[str, Any]]]:
    """Call Groq to extract structured entities from a batch of chunks with retry on rate limits."""
    client = get_groq_client()

    user_content = f"Document Text:\n{batch_text}\n\nExtract all explicitly named components, ports, interfaces, and signals as JSON."
    if retry_strict:
        user_content += "\n\nCRITICAL: Return ONLY a valid JSON object with key 'entities'. Do not include explanation or markdown."

    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "entities" in parsed and isinstance(parsed["entities"], list):
                return parsed["entities"]
            logger.warning(f"Unexpected JSON format from Groq extraction: {content[:200]}")
            return None
        except RateLimitError as e:
            if attempt < max_retries:
                wait_s = 4.0 * (attempt + 1)
                logger.warning(f"Rate limit in Groq extraction (attempt {attempt + 1}), waiting {wait_s}s...")
                time.sleep(wait_s)
                continue
            logger.error(f"Rate limit exceeded during Groq extraction: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error during Groq extraction call: {e}")
            return None
    return None


async def extract_document_entities(
    document_id: str,
    max_words_per_batch: int = 1200,
    max_batches: Optional[int] = None,
) -> ExtractionResult:
    """
    Perform a full-document sweep across all chunks for document_id:
    - Batches chunks up to max_words_per_batch.
    - Prompts Groq to extract strictly grounded technical entities.
    - Retries once if JSON is malformed.
    - Cross-checks all entity names against the document text to eliminate hallucinations.
    - Deduplicates entities across batches while preserving the first occurrence's citation.
    """
    async with get_db() as db:
        async with db.execute(
            """
            SELECT id, document_id, chunk_index, section_title, page_start, page_end, text, word_count
            FROM chunks
            WHERE document_id = ?
            ORDER BY chunk_index ASC
            """,
            (document_id,),
        ) as cursor:
            rows = await cursor.fetchall()

    if not rows:
        return ExtractionResult(
            document_id=document_id,
            entities=[],
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    all_chunks = [dict(r) for r in rows]
    chunk_map = {c["id"]: c for c in all_chunks}

    # 1. Group chunks into batches up to max_words_per_batch
    batches: List[List[Dict[str, Any]]] = []
    current_batch: List[Dict[str, Any]] = []
    current_words = 0

    for c in all_chunks:
        w_count = c.get("word_count", len(c.get("text", "").split()))
        if current_batch and (current_words + w_count > max_words_per_batch):
            batches.append(current_batch)
            current_batch = [c]
            current_words = w_count
        else:
            current_batch.append(c)
            current_words += w_count

    if current_batch:
        batches.append(current_batch)

    if max_batches and max_batches > 0:
        logger.info(f"Limiting extraction to first {max_batches} of {len(batches)} batches.")
        batches = batches[:max_batches]

    logger.info(f"Extracting entities for document '{document_id}' across {len(batches)} batch(es)...")

    raw_entities: List[Dict[str, Any]] = []

    # 2. Execute extraction for each batch
    for b_idx, batch in enumerate(batches):
        batch_text = format_batch_text(batch)
        extracted = call_groq_extraction(batch_text, retry_strict=False)

        # Retry once if initial extraction failed
        if extracted is None:
            logger.info(f"Retrying batch {b_idx + 1} with strict JSON prompt...")
            extracted = call_groq_extraction(batch_text, retry_strict=True)

        if extracted:
            raw_entities.extend(extracted)
        else:
            logger.warning(f"Batch {b_idx + 1} for document '{document_id}' yielded no parseable entities.")

        time.sleep(1.0)

    valid_types = {"component", "port", "interface", "signal", "other"}
    validated_entities: List[ExtractedEntity] = []

    # 3. Grounding validation & metadata resolution
    for item in raw_entities:
        name = str(item.get("name", "")).strip()
        if not name or len(name) < 2:
            continue

        raw_type = str(item.get("entity_type", "other")).strip().lower()
        entity_type = raw_type if raw_type in valid_types else "other"
        description = str(item.get("description", "")).strip() or f"Extracted {entity_type} from specification."

        # Grounding check: verify entity name literally appears in document text
        # (case-insensitive search across chunks)
        claimed_id = str(item.get("source_chunk_id", "")).strip()
        matched_chunk = None

        if claimed_id in chunk_map and name.lower() in chunk_map[claimed_id]["text"].lower():
            matched_chunk = chunk_map[claimed_id]
        else:
            # Locate first chunk where entity name is a substring
            for c in all_chunks:
                if name.lower() in c["text"].lower():
                    matched_chunk = c
                    break

        if not matched_chunk:
            # Hallucination guard: skip entities not present in any chunk
            logger.warning(f"Discarding ungrounded hallucinated entity '{name}' not found in document text.")
            continue

        validated_entities.append(
            ExtractedEntity(
                name=name,
                entity_type=entity_type,  # type: ignore[arg-type]
                description=description,
                section_title=matched_chunk.get("section_title"),
                page_start=matched_chunk["page_start"],
                page_end=matched_chunk["page_end"],
                source_chunk_id=matched_chunk["id"],
            )
        )

    # 4. De-duplicate across batches by (name.lower(), entity_type) preserving first citation
    seen_keys = set()
    deduped_entities: List[ExtractedEntity] = []

    for ent in validated_entities:
        key = (ent.name.lower(), ent.entity_type)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped_entities.append(ent)

    # Sort alphabetically by entity_type then name
    type_priority = {"component": 1, "port": 2, "interface": 3, "signal": 4, "other": 5}
    deduped_entities.sort(key=lambda e: (type_priority.get(e.entity_type, 99), e.name.lower()))

    now_iso = datetime.now(timezone.utc).isoformat()
    logger.info(
        f"Document '{document_id}' extraction complete: {len(deduped_entities)} verified unique entities."
    )

    return ExtractionResult(
        document_id=document_id,
        entities=deduped_entities,
        generated_at=now_iso,
    )
