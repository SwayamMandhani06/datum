import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple
from app.parsing import ParsedBlock

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    chunk_index: int
    section_title: Optional[str]
    page_start: int
    page_end: int
    text: str
    word_count: int


@dataclass
class Section:
    heading_title: Optional[str]
    heading_context: Optional[str]
    heading_level: int
    blocks: List[ParsedBlock]


def build_chunks_from_blocks(blocks: List[ParsedBlock], min_body_words: int = 15) -> List[Chunk]:
    """
    Perform section-aware chunking on a stream of ParsedBlocks.
    - Target chunk size: 300-450 words.
    - 60-word overlap on multi-chunk splits.
    - Hierarchy-aware forward merging for small sections (< 100 words).
    - Minimum-content guard: merges forward or discards sections/chunks with < 15 body words.
    - Page-accurate page_start and page_end tracking.
    """
    if not blocks:
        return []

    # 1. Group consecutive blocks sharing the same heading_context into Sections
    sections: List[Section] = []
    for block in blocks:
        if (
            sections
            and sections[-1].heading_context == block.heading_context
            and sections[-1].heading_level == block.heading_level
        ):
            sections[-1].blocks.append(block)
        else:
            sections.append(
                Section(
                    heading_title=block.heading_title,
                    heading_context=block.heading_context,
                    heading_level=block.heading_level,
                    blocks=[block],
                )
            )

    # 2. Forward-merge short sections (< 100 words) where hierarchy permits
    merged_sections: List[Section] = []
    i = 0
    while i < len(sections):
        curr_sec = sections[i]
        curr_words = sum(len(b.text.split()) for b in curr_sec.blocks)

        # Check if small and eligible to merge into the next section
        if curr_words < 100 and i + 1 < len(sections):
            next_sec = sections[i + 1]

            # Do NOT merge across a heading of equal or higher hierarchical level
            # (e.g. level 2 (4.2) should not merge forward into level 2 (4.3) or level 1 (5.0))
            can_merge = False
            if curr_sec.heading_title is None:
                # Untitled text can merge forward into the next section
                can_merge = True
            elif next_sec.heading_level > curr_sec.heading_level:
                # Introduction of parent section merging into its first subsection
                can_merge = True

            if can_merge:
                # Merge curr_sec blocks into next_sec
                next_sec.blocks = curr_sec.blocks + next_sec.blocks
                i += 1
                continue

        merged_sections.append(curr_sec)
        i += 1

    # 2b. Minimum-content guard: merge forward or discard sections with < 15 body words
    guarded_sections: List[Section] = []
    i = 0
    while i < len(merged_sections):
        curr_sec = merged_sections[i]
        total_sec_words = sum(len(b.text.split()) for b in curr_sec.blocks)
        title_words = len(curr_sec.heading_title.split()) if curr_sec.heading_title else 0
        body_words = max(0, total_sec_words - title_words)

        if body_words < min_body_words:
            if i + 1 < len(merged_sections):
                next_sec = merged_sections[i + 1]
                logger.warning(
                    f"Near-empty section '{curr_sec.heading_title}' on page {curr_sec.blocks[0].page_number} "
                    f"has only {body_words} body words (< {min_body_words}). Merging forward into '{next_sec.heading_title}'."
                )
                next_sec.blocks = curr_sec.blocks + next_sec.blocks
                i += 1
                continue
            else:
                logger.warning(
                    f"Discarding trailing near-empty section '{curr_sec.heading_title}' on page {curr_sec.blocks[0].page_number} "
                    f"with {body_words} body words (< {min_body_words})."
                )
                i += 1
                continue

        guarded_sections.append(curr_sec)
        i += 1

    # 3. Generate chunks from guarded sections
    final_chunks: List[Chunk] = []
    chunk_counter = 0

    TARGET_MAX_WORDS = 420
    OVERLAP_WORDS = 60
    STEP_WORDS = TARGET_MAX_WORDS - OVERLAP_WORDS  # 360 words

    for sec in guarded_sections:
        # Build token stream mapped to page numbers: (word_string, page_number)
        word_items: List[Tuple[str, int]] = []
        for b in sec.blocks:
            words = b.text.split()
            for w in words:
                word_items.append((w, b.page_number))

        total_words = len(word_items)
        if total_words == 0:
            continue

        title_for_chunk = sec.heading_title

        if total_words <= 450:
            # Entire section fits into a single chunk
            chunk_text = " ".join(w[0] for w in word_items)
            final_chunks.append(
                Chunk(
                    chunk_index=chunk_counter,
                    section_title=title_for_chunk,
                    page_start=word_items[0][1],
                    page_end=word_items[-1][1],
                    text=chunk_text,
                    word_count=total_words,
                )
            )
            chunk_counter += 1
        else:
            # Section exceeds target size: split with overlap
            start_idx = 0
            while start_idx < total_words:
                end_idx = min(start_idx + TARGET_MAX_WORDS, total_words)

                # Avoid tiny trailing slices (< 80 words) by rolling them into the current chunk
                if total_words - end_idx < 80:
                    end_idx = total_words

                slice_words = word_items[start_idx:end_idx]
                chunk_text = " ".join(w[0] for w in slice_words)

                final_chunks.append(
                    Chunk(
                        chunk_index=chunk_counter,
                        section_title=title_for_chunk,
                        page_start=slice_words[0][1],
                        page_end=slice_words[-1][1],
                        text=chunk_text,
                        word_count=len(slice_words),
                    )
                )
                chunk_counter += 1

                if end_idx == total_words:
                    break

                start_idx += STEP_WORDS

    # 4. Final safety guard: filter any residual chunks with < min_body_words
    clean_chunks: List[Chunk] = []
    for c in final_chunks:
        t_words = len(c.section_title.split()) if c.section_title else 0
        b_words = c.word_count - t_words if (c.section_title and c.text.startswith(c.section_title)) else c.word_count
        if b_words < min_body_words:
            logger.warning(
                f"Discarding near-empty final chunk {c.chunk_index} ('{c.section_title}') with only {b_words} body words (< {min_body_words})."
            )
            continue
        clean_chunks.append(c)

    # Re-index chunks sequentially
    for idx, c in enumerate(clean_chunks):
        c.chunk_index = idx

    return clean_chunks

