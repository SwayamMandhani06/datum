import logging
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Optional, Set, Tuple
import pymupdf

logger = logging.getLogger(__name__)


@dataclass
class ParsedBlock:
    page_number: int
    heading_context: Optional[str]  # e.g., "4 Software Component Template > 4.2 Sensor-Actuator Component"
    heading_title: Optional[str]    # e.g., "4.2 Sensor-Actuator Component"
    heading_level: int              # 1, 2, 3, etc. (0 if no heading)
    text: str


# Numbered heading pattern, e.g. "4 Software Component", "4.2 Sensor-Actuator", "B.5.3 Ecu description", "D.1 Constraint History"
NUMBERED_HEADING_REGEX = re.compile(
    r"^(?:Section\s+)?((?:[A-Za-z]|\d+)(?:\.\d+)*)\.?(?:\s+([A-Za-z0-9_].*))?$",
    re.IGNORECASE,
)


def clean_text(text: str) -> str:
    """Normalize whitespace and control characters."""
    return re.sub(r"\s+", " ", text).strip()


def normalize_pattern_text(text: str) -> str:
    """Normalize digits to '#' and lowercase for robust header/footer frequency matching."""
    cleaned = clean_text(text).lower()
    return re.sub(r"\b\d+\b", "#", cleaned)


def find_running_headers_footers(
    doc: pymupdf.Document,
    top_margin_pct: float = 0.10,
    bot_margin_pct: float = 0.10,
    min_page_ratio: float = 0.20,
) -> Tuple[Set[str], Set[str]]:
    """
    Perform a document-wide pass to identify repeated running headers and footers.
    Collects short text spans (<= 12 words) in the top and bottom margins across all pages.
    If an identical or near-identical (ignoring page numbers) pattern appears on more than
    ~20% of pages (minimum 2 pages), it is classified as a running header or footer.
    """
    total_pages = doc.page_count
    if total_pages < 2:
        return set(), set()

    candidates = defaultdict(set)  # (norm_text, "top"|"bot") -> set of page indices

    for page_idx in range(total_pages):
        page = doc[page_idx]
        h = page.rect.height
        top_limit = h * (top_margin_pct + 0.02)
        bot_limit = h * (1.0 - bot_margin_pct - 0.02)

        page_dict = page.get_text("dict")
        for b in page_dict.get("blocks", []):
            if b.get("type") == 0:  # text block
                for line in b.get("lines", []):
                    bbox = line.get("bbox", [0, 0, 0, 0])
                    is_top = bbox[1] <= top_limit
                    is_bot = bbox[3] >= bot_limit

                    if is_top or is_bot:
                        spans = line.get("spans", [])
                        text = " ".join(s.get("text", "").strip() for s in spans if s.get("text", "").strip())
                        text = clean_text(text)
                        if not text:
                            continue
                        words = text.split()
                        if len(words) <= 12:
                            norm_text = normalize_pattern_text(text)
                            pos = "top" if is_top else "bot"
                            candidates[(norm_text, pos)].add(page_idx)

    threshold = max(2, int(total_pages * min_page_ratio))
    top_patterns: Set[str] = set()
    bot_patterns: Set[str] = set()

    for (norm_text, pos), pages in candidates.items():
        if len(pages) >= threshold:
            if pos == "top":
                top_patterns.add(norm_text)
            else:
                bot_patterns.add(norm_text)

    if top_patterns or bot_patterns:
        logger.info(
            f"Detected {len(top_patterns)} running header patterns and {len(bot_patterns)} "
            f"running footer patterns across {total_pages} pages (threshold: {threshold} pages)."
        )

    return top_patterns, bot_patterns


def is_running_header_or_footer(
    text: str,
    bbox: List[float],
    page_height: float,
    top_patterns: Set[str],
    bot_patterns: Set[str],
    top_margin_pct: float = 0.10,
    bot_margin_pct: float = 0.10,
) -> bool:
    """Check if a line matches any detected running header or footer pattern in margin areas."""
    if not text or (not top_patterns and not bot_patterns):
        return False
    words = text.split()
    if len(words) > 12:
        return False

    norm_text = normalize_pattern_text(text)
    top_limit = page_height * (top_margin_pct + 0.02)
    bot_limit = page_height * (1.0 - bot_margin_pct - 0.02)

    if bbox[1] <= top_limit and norm_text in top_patterns:
        return True
    if bbox[3] >= bot_limit and norm_text in bot_patterns:
        return True
    return False


def parse_pdf(file_path: str) -> Tuple[int, List[ParsedBlock]]:
    """
    Parse a PDF file using PyMuPDF span-level layout analysis.
    Extracts text, identifies section headings, tracks hierarchy,
    and returns (page_count, list of ParsedBlocks).
    Excludes running headers and footers from headings and body text.
    """
    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        raise ValueError(f"Failed to open PDF document: {str(e)}") from e

    page_count = doc.page_count
    if page_count == 0:
        doc.close()
        raise ValueError("PDF document is empty (0 pages).")

    # Document-wide pass: detect running headers and footers
    top_patterns, bot_patterns = find_running_headers_footers(doc)

    all_blocks: List[ParsedBlock] = []
    total_words = 0

    # Running hierarchy stack: list of (level, heading_title)
    heading_stack: List[Tuple[int, str]] = []
    current_heading_title: Optional[str] = None
    current_heading_level: int = 0

    try:
        for page_idx in range(page_count):
            page = doc[page_idx]
            page_num = page_idx + 1
            page_height = page.rect.height

            page_dict = page.get_text("dict")
            blocks = page_dict.get("blocks", [])

            # 1. Determine page body font size (most frequent size by character count)
            size_counts = {}
            for b in blocks:
                if b.get("type") == 0:  # text block
                    for line in b.get("lines", []):
                        for span in line.get("spans", []):
                            txt = span.get("text", "").strip()
                            if txt:
                                sz = round(span.get("size", 10.0), 1)
                                size_counts[sz] = size_counts.get(sz, 0) + len(txt)

            body_font_size = max(size_counts, key=size_counts.get) if size_counts else 10.0

            # 2. Iterate through text lines and identify headings vs body text
            current_paragraph_lines: List[str] = []

            def flush_paragraph():
                nonlocal current_paragraph_lines
                if current_paragraph_lines:
                    para_text = clean_text(" ".join(current_paragraph_lines))
                    if para_text:
                        context_str = " > ".join(h[1] for h in heading_stack) if heading_stack else None
                        all_blocks.append(
                            ParsedBlock(
                                page_number=page_num,
                                heading_context=context_str,
                                heading_title=current_heading_title,
                                heading_level=current_heading_level,
                                text=para_text,
                            )
                        )
                    current_paragraph_lines = []

            for b in blocks:
                if b.get("type") != 0:
                    continue

                for line in b.get("lines", []):
                    spans = line.get("spans", [])
                    if not spans:
                        continue

                    line_text = clean_text(" ".join(s.get("text", "").strip() for s in spans if s.get("text", "").strip()))
                    if not line_text:
                        continue

                    line_bbox = line.get("bbox", [0, 0, 0, 0])

                    # Exclude running headers/footers entirely
                    if is_running_header_or_footer(line_text, line_bbox, page_height, top_patterns, bot_patterns):
                        continue

                    total_words += len(line_text.split())

                    # Calculate max font size and bold flag for this line
                    max_size = max((s.get("size", 0.0) for s in spans), default=0.0)
                    is_bold = any(
                        (
                            (s.get("flags", 0) & 2 != 0)
                            or "bold" in s.get("font", "").lower()
                            or "black" in s.get("font", "").lower()
                            or "heavy" in s.get("font", "").lower()
                        )
                        for s in spans
                    )
                    is_larger = max_size >= body_font_size + 1.2
                    words = line_text.split()
                    word_count = len(words)

                    # Check if line is a heading candidate
                    numbered_match = NUMBERED_HEADING_REGEX.match(line_text)
                    is_heading_candidate = False
                    detected_level = 1

                    if (is_larger or is_bold) and numbered_match:
                        num_str = numbered_match.group(1)
                        title_part = numbered_match.group(2)
                        # Valid numbered heading requires either a multi-part number (e.g. 4.2) or trailing title words
                        if "." in num_str or title_part:
                            is_heading_candidate = True
                            detected_level = len(num_str.split("."))
                    elif (is_larger or (is_bold and max_size >= body_font_size)) and word_count < 12:
                        # Short bold/larger text that doesn't end with typical sentence punctuation
                        if not line_text.endswith((".", ";", ",", ":")):
                            is_heading_candidate = True
                            if max_size >= body_font_size + 4.0:
                                detected_level = 1
                            elif max_size >= body_font_size + 2.0:
                                detected_level = 2
                            else:
                                detected_level = 3

                    if is_heading_candidate:
                        # Flush any preceding accumulated body text
                        flush_paragraph()

                        # Update heading hierarchy stack
                        current_heading_title = line_text
                        current_heading_level = detected_level

                        while heading_stack and heading_stack[-1][0] >= detected_level:
                            heading_stack.pop()

                        heading_stack.append((detected_level, line_text))
                        current_paragraph_lines.append(line_text)
                    else:
                        current_paragraph_lines.append(line_text)

                # End of a block typically marks a paragraph boundary
                flush_paragraph()

            flush_paragraph()

    finally:
        doc.close()

    if total_words < 10:
        raise ValueError(
            "No extractable text found in PDF. Scanned or image-only PDFs are not currently supported."
        )

    return page_count, all_blocks

