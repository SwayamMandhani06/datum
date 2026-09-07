# Datum

> Grounded AI assistant for AUTOSAR High-Level Design (HLD) specifications.

## Problem Statement

Automotive software systems are governed by extensive AUTOSAR (AUTomotive Open System ARchitecture) Classic and Adaptive platform specifications spanning hundreds of pages per module. During ECU architecture reviews and component integration, engineers must manually navigate complex, unstructured High-Level Design (HLD) PDFs to verify port prototypes, interface semantics, runnable execution triggers, and timing budgets.

Generic LLMs frequently hallucinate port names, misattribute interface contracts, or fabricate timing parameters without reference. Datum resolves this by strictly grounding every synthesized answer in verifiable document evidence, linking technical claims directly to exact section numbers, page boundaries, and source excerpts.

---

## Current Status & Feature Scope

Datum is currently in **Phase 1: Frontend & Visual Design Pilot**. The interface runs with static, high-fidelity mock data grounded in real AUTOSAR Classic 4.4.0 software component templates. The real-time backend RAG pipeline will be introduced in subsequent phases.

### Implemented Features (MVP Pilot)
- **Cited Q&A Workspace**: Scrollable conversation stream with right-aligned technical queries and left-aligned answers featuring inline clickable citations (`[1]`, `[2]`).
- **Grounded Evidence Drawer**: Dedicated right panel sliding in smoothly (~200ms) on citation selection, displaying the exact source excerpt at 17px reading size on an authentic `#DCD3BC` paper background with SHA-256 verification indicator.
- **Low-Confidence Auditing**: Flagging uncertain extractions with plain-text warnings (`Low confidence — verify against source`) without decorative pills or badge chrome.
- **Dual Persistent Design System (v2)**:
  - **Blueprint Theme**: Deep, desaturated slate dark mode (`#14181D` base, `#4B9E96` matte teal accent).
  - **Drafting Theme**: Matte vellum light mode (`#F1ECE0` base, `#2E8880` deep teal accent).
  - Persistent via `localStorage` across user sessions.
- **Restrained Glassmorphism**: High-contrast architectural chrome (`backdrop-blur(12px)`) restricted strictly to the floating top navigation, drawer header strip, and dialog overlays, leaving content surfaces solid matte.
- **Subtle Procedural Grain**: Inline SVG fractal noise turbulence filter fixed at ~3% opacity.
- **Landing Page & Route Separation**: Dedicated landing page at `/` with product rationale, interactive visual split (ink vs. paper), and direct route to `/workspace`.
- **Multi-Specification Scope**: Document list rail (~268px) with PDF/ARXML badges, page counters, and upload date metadata formatted in IBM Plex Mono.

---

## Tech Stack

| Layer | Technology | Version / Tool | Status |
|---|---|---|---|
| **UI Framework** | React | 19.x | Implemented |
| **Build & Dev Server** | Vite | 8.x | Implemented |
| **Language** | TypeScript | 6.x | Implemented |
| **Styling** | Tailwind CSS | 3.4.x | Implemented |
| **Routing** | React Router DOM | 7.x | Implemented |
| **Typography** | IBM Plex Sans & Mono | Google Fonts | Implemented |
| **API Framework** | FastAPI | Python 3.11+ | *Planned (Phase 2)* |
| **Vector Database** | Qdrant | Distributed | *Planned (Phase 3)* |
| **Inference & LLM** | Groq / Llama 3.3 | Groq API | *Planned (Phase 3)* |
| **Embedding Model** | sentence-transformers | BGE / E5-v2 | *Planned (Phase 3)* |
| **PDF Extraction** | PyMuPDF / pdfplumber | Native layout | *Planned (Phase 2)* |

---

## Monorepo Layout

```
datum/
├── .gitignore               # Unified root gitignore (Node + Python + OS)
├── README.md                # Project documentation and specifications
├── package.json             # Root workspace runner scripts
├── backend/                 # Backend API service (FastAPI + Qdrant RAG)
│   └── .gitkeep             # Placeholder for upcoming backend implementation
└── frontend/                # React + Vite + TypeScript frontend application
    ├── index.html           # HTML entrypoint with IBM Plex font preconnects
    ├── package.json         # Frontend dependencies and build scripts
    ├── postcss.config.js    # PostCSS configuration for Tailwind
    ├── tailwind.config.js   # Design system v2 tokens and CSS variables
    ├── tsconfig.json        # TypeScript configuration
    └── src/
        ├── App.tsx          # Root application router with ThemeProvider
        ├── main.tsx         # React application bootstrap
        ├── index.css        # CSS variables, themes, glassmorphism, scrollbars
        ├── types.ts         # TypeScript models (Document, Citation, QAExchange)
        ├── context/
        │   └── ThemeContext.tsx    # Runtime Blueprint/Drafting theme state
        ├── data/
        │   └── mockData.ts         # AUTOSAR Classic 4.4.0 grounding dataset
        ├── pages/
        │   ├── LandingPage.tsx     # Landing page (hero, 3 steps, visual split)
        │   └── WorkspacePage.tsx   # Three-pane engineering workspace
        └── components/
            ├── Header.tsx           # Glassmorphic top navigation bar
            ├── ThemeToggle.tsx      # Persistent Blueprint / Drafting switcher
            ├── DocumentListRail.tsx # Left navigation rail (~268px)
            ├── ConversationView.tsx # Center Q&A stream and input bar
            ├── EvidenceDrawer.tsx   # Paper-toned citation drawer (~340px)
            └── NoiseOverlay.tsx     # Inline SVG fractal noise texture
```

---

## Local Setup

### Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js 24.x)
- npm >= 9.0.0

### Running the Frontend
1. Clone the repository:
   ```bash
   git clone https://github.com/SwayamMandhani06/datum.git
   cd datum
   ```

2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

   Alternatively, you can run the dev server from the repository root:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173` (or the port indicated in your terminal).

### Production Build
```bash
cd frontend
npm run build
```

---

## Roadmap

1. **Phase 1: Frontend & Visual Design System** *(Complete)*
   - Three-pane engineering workspace with strict token constraints.
   - Dual Blueprint/Drafting themes with localStorage persistence.
   - Grounded paper-tone evidence drawer with 200ms motion moment.
   - Landing page with authentic AUTOSAR visual previews.

2. **Phase 2: Backend Document Ingestion** *(Upcoming)*
   - FastAPI microservice with document upload endpoints.
   - Hierarchical PDF parsing preserving chapter numbers, table rows, and page offsets.
   - ARXML parser for Software Component descriptions (`PPortPrototype`, `RPortPrototype`).

3. **Phase 3: Dense Retrieval & RAG Pipeline**
   - Chunk embedding using domain-adapted sentence transformers.
   - Qdrant vector index with payload metadata filtering by document ID and standard version.
   - Groq inference pipeline outputting structured citation indices linked to bounding boxes.

4. **Phase 4: Full-Stack Integration & Deployment**
   - Connect frontend API client to FastAPI backend streaming endpoints.
   - In-line PDF viewer highlighting exact sentence bounding boxes inside the evidence drawer.
   - Docker Compose deployment for multi-container orchestration.

5. **Phase 5: ASIL-D & Safety Traceability Validation**
   - Audit trail export for ISO 26262 tool qualification.
   - Automated citation accuracy evaluation against benchmark AUTOSAR test suites.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
