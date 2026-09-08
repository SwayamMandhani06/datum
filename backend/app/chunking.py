from dataclasses import dataclass
from typing import List, Optional, Tuple
from app.parsing import ParsedBlock


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


def build_chunks_from_blocks(blocks: List[ParsedBlock]) -> List[Chunk]:
    """
    Perform section-aware chunking on a stream of ParsedBlocks.
    - Target chunk size: 300-450 words.
    - 60-word overlap on multi-chunk splits.
    - Hierarchy-aware forward merging for small sections (< 100 words).
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

    # 3. Generate chunks from merged sections
    final_chunks: List[Chunk] = []
    chunk_counter = 0

    TARGET_MAX_WORDS = 420
    OVERLAP_WORDS = 60
    STEP_WORDS = TARGET_MAX_WORDS - OVERLAP_WORDS  # 360 words

    for sec in merged_sections:
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

    return final_chunks
