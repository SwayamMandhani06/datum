import re
from dataclasses import dataclass
from typing import List, Optional, Tuple
import pymupdf


@dataclass
class ParsedBlock:
    page_number: int
    heading_context: Optional[str]  # e.g., "4 Software Component Template > 4.2 Sensor-Actuator Component"
    heading_title: Optional[str]    # e.g., "4.2 Sensor-Actuator Component"
    heading_level: int              # 1, 2, 3, etc. (0 if no heading)
    text: str


# Numbered heading pattern, e.g. "4 Software Component", "4.2 Sensor-Actuator", "4.2.1 Ports"
NUMBERED_HEADING_REGEX = re.compile(
    r"^(?:Section\s+)?(\d+(?:\.\d+)*)\.?\s+([A-Za-z0-9_].*)$",
    re.IGNORECASE
)


def clean_text(text: str) -> str:
    """Normalize whitespace and control characters."""
    return re.sub(r"\s+", " ", text).strip()


def parse_pdf(file_path: str) -> Tuple[int, List[ParsedBlock]]:
    """
    Parse a PDF file using PyMuPDF span-level layout analysis.
    Extracts text, identifies section headings, tracks hierarchy,
    and returns (page_count, list of ParsedBlocks).
    """
    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        raise ValueError(f"Failed to open PDF document: {str(e)}") from e

    page_count = doc.page_count
    if page_count == 0:
        doc.close()
        raise ValueError("PDF document is empty (0 pages).")

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
                        # Numbered heading pattern (e.g. "4.2 Engine Speed Sensor")
                        is_heading_candidate = True
                        num_str = numbered_match.group(1)
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
