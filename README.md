# Datum

> Grounded AI assistant for AUTOSAR High-Level Design (HLD) specifications.

## Problem Statement

Automotive software systems are governed by extensive AUTOSAR (AUTomotive Open System ARchitecture) Classic and Adaptive platform specifications spanning hundreds of pages per module. During ECU architecture reviews and component integration, engineers must manually navigate complex, unstructured High-Level Design (HLD) PDFs to verify port prototypes, interface semantics, runnable execution triggers, and timing budgets.

Generic LLMs frequently hallucinate port names, misattribute interface contracts, or fabricate timing parameters without reference. Datum resolves this by strictly grounding every synthesized answer in verifiable document evidence, linking technical claims directly to exact section numbers, page boundaries, and source excerpts.

---

## Current Status & Feature Scope

Datum is currently in **Phase 5: Full-Stack Integration**. The frontend interface runs with an authentic AUTOSAR Classic 4.4.0 design system, connected live to the backend FastAPI service for real-time document upload, multi-page layout parsing, section-aware chunking, dense vector retrieval, and citation-grounded Q&A via Groq.

### Implemented Features
- **Full-Stack Live Integration**: React frontend connected directly to FastAPI backend via typed API client. Supports live document listing, synchronous upload with progress states and generous timeout (120s), inline document deletion, real-time citation-grounded Q&A powered by Groq, and automatic persistence of chat history.
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
- **Multi-Specification Scope**: Document list rail (~280px) with PDF badges, page counters, upload date metadata, and live processing/embedding/failed status indicators.
- **Document Ingestion & Parsing**: FastAPI endpoint `/documents/upload` accepting PDFs, validating MIME type and file size limits (configurable, default 50MB).
- **Span-Level Structural Parsing**: PyMuPDF extraction analyzing font sizes, bold weights, and numbered patterns (`4.2`, `4.2.1`, `B.5.3`) to construct hierarchical heading stacks while excluding repeated running headers and footers across pages.
- **Section-Aware Chunking**: 300–450 word target windows, ~60-word intra-section overlap, boundary preservation, hierarchy-preserving forward merge, minimum-content guard (>= 15 words), and duplicate chunk deduplication.
- **SQLite Storage**: Asynchronous database persistence via `aiosqlite` with foreign key cascade deletion for documents and chunks.
- **Dense Vector Retrieval**: Integrated semantic search using `sentence-transformers` (`BAAI/bge-small-en-v1.5`) and `qdrant-client` vector store with document-scoped payload filtering.
- **LLM-Generated, Citation-Grounded Answers**: Strict evidence-grounded question answering powered by Groq (`llama-3.1-8b-instant`) with automatic citation validation, invented marker stripping, and confidence evaluation.
- **Structured Entity Extraction & Export**: Full-document chunk sweep extracting explicitly named components, ports, interfaces, and signals with zero-hallucination substring verification. Cached in SQLite (`extractions` table) with force-refresh support and downloadable export in CSV and JSON formats.
- **Dedicated Structure Workspace View**: Multi-tab workspace offering seamless switching between grounded Conversation and an interactive architectural Structure Table with entity type filters, search, and CSV/JSON export.
- **Audit Trail & Traceability**: SQLite `chat_history` table and `GET /documents/{id}/history` endpoint preserving exact question-answer pairs, validated citation excerpts, and confidence ratings for safety audits.


---

## Tech Stack

| Layer | Technology | Version / Tool | Status |
|---|---|---|---|
| **UI Framework** | React | 19.x | Implemented |
| **Build & Dev Server** | Vite | 8.x | Implemented |
| **Language** | TypeScript & Python | TS 6.x / Python 3.11+ | Implemented |
| **Styling** | Tailwind CSS | 3.4.x | Implemented |
| **Routing** | React Router DOM | 7.x | Implemented |
| **Typography** | IBM Plex Sans & Mono | Google Fonts | Implemented |
| **API Framework** | FastAPI | 0.115+ | Implemented |
| **PDF Extraction** | PyMuPDF | 1.25+ (span-level layout) | Implemented |
| **Database** | SQLite / aiosqlite | 0.20+ async SQLite | Implemented |
| **Embedding Model** | sentence-transformers | BAAI/bge-small-en-v1.5 | Implemented |
| **Vector Database** | Qdrant | Cloud / In-Memory | Implemented |
| **Inference & LLM** | Groq / Qwen | Groq API (`qwen/qwen3.8-27b`) | Implemented |

---

## Monorepo Layout

```
datum/
├── .gitignore               # Unified root gitignore (Node + Python + OS)
├── README.md                # Project documentation and specifications
├── package.json             # Root workspace runner scripts
├── backend/                 # Backend API service (FastAPI + SQLite + Qdrant + Groq)
│   ├── app/                 # Application package
│   │   ├── main.py          # FastAPI application & CORS configuration
│   │   ├── models.py        # Pydantic request/response schemas
│   │   ├── database.py      # aiosqlite connection pool & schema migration
│   │   ├── parsing.py       # PyMuPDF span-level heading & text extraction
│   │   ├── chunking.py      # Section-aware chunking (300-450 words, 60-word overlap)
│   │   ├── embeddings.py    # BGE-small singleton embedding & query prefixing
│   │   ├── vectorstore.py   # Qdrant client, collection init, upsert, delete & search
│   │   ├── generation.py    # Groq LLM client, grounding prompt, citation sanitization
│   │   └── routes/
│   │       └── documents.py # /documents upload, list, chunks, delete, search, ask, and history
│   ├── uploads/             # Local PDF storage directory (.gitkeep)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment configuration template
│   └── test_pipeline.py     # End-to-end ingestion, vector search, and Q&A test suite
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
        ├── types.ts         # TypeScript models (Document, Citation, QAExchange, Extraction)
        ├── api/
        │   └── client.ts           # Typed API client for FastAPI endpoints
        ├── context/
        │   └── ThemeContext.tsx    # Runtime Blueprint/Drafting theme state
        ├── pages/
        │   ├── LandingPage.tsx     # Landing page (hero, 3 steps, visual split)
        │   └── WorkspacePage.tsx   # Three-pane engineering workspace
        └── components/
            ├── Header.tsx           # Glassmorphic top navigation bar
            ├── ThemeToggle.tsx      # Persistent Blueprint / Drafting switcher
            ├── DocumentListRail.tsx # Left navigation rail (~268px)
            ├── ConversationView.tsx # Center Q&A stream and input bar
            ├── StructureView.tsx    # Architectural entity extraction table & export
            ├── EvidenceDrawer.tsx   # Paper-toned citation drawer (~340px)
            └── NoiseOverlay.tsx     # Inline SVG fractal noise texture
```

---

## Local Setup

### Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js 24.x)
- npm >= 9.0.0
- Python >= 3.11

### Running the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Windows (Command Prompt)
   .\.venv\Scripts\activate.bat

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create local environment configuration:
   ```bash
   cp .env.example .env
   ```
   > [!NOTE]
   > - For semantic vector search, create a free cluster at [Qdrant Cloud](https://cloud.qdrant.io/) and configure `QDRANT_URL` and `QDRANT_API_KEY` in `backend/.env`. For local offline testing, setting `QDRANT_URL=:memory:` is supported.
   > - For LLM question answering, create a free API key at [Groq Console](https://console.groq.com/keys) and configure `GROQ_API_KEY` and `GROQ_MODEL=llama-3.1-8b-instant` in `backend/.env`.

5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

6. Verify server health:
   ```bash
   curl http://127.0.0.1:8000/health
   ```

### Running the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create local environment configuration:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL=http://localhost:8000` is set to point to the FastAPI backend.

4. Launch the development server:
   ```bash
   npm run dev
   ```

   Alternatively, you can run the dev server from the repository root:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:5173` (or the port indicated in your terminal).

> [!IMPORTANT]
> Both the backend (`uvicorn app.main:app --reload --port 8000` inside `backend/`) and frontend (`npm run dev` inside `frontend/`) must be running simultaneously for local development.

### Production Build
```bash
cd frontend
npm run build
```

---

## Testing

An automated, self-contained `pytest` test suite verifies the end-to-end Datum pipeline without requiring manual interaction via `/docs`. The suite uses on-the-fly synthetic PDFs generated via `fpdf2` (including running headers and distinct component interfaces) to validate:
- **Ingestion & Validation** (`test_ingestion.py`): Valid PDF upload, MIME format rejection (`.txt`), and oversized file rejection (`413 Content Too Large`).
- **Layout & Chunking** (`test_chunking.py`): Minimum-content guard (no near-empty chunks < 15 words), chunk text uniqueness, and running-header exclusion regression checks.
- **Dense Retrieval** (`test_retrieval.py`): Semantic relevancy search (locating `pp_TestSignal`), and multi-document query isolation.
- **Grounded Generation** (`test_generation.py`): Citation-grounded answer synthesis via Groq, citation cross-validation against stored chunks, out-of-scope question refusal (`low` confidence with empty citations), and non-ready document status guards (`409 Conflict`).
- **Document Lifecycle & Audit** (`test_lifecycle.py`): Deletion cascading across SQLite and Qdrant vectors, and persistent audit trail recording (`chat_history`).

### Running Tests Locally

Navigate to the `backend/` directory and execute `pytest`:

```bash
cd backend
pytest -v
```

> [!NOTE]
> Tests that require external services (Qdrant vector store and Groq LLM inference) automatically inspect the local environment (`QDRANT_URL`, `QDRANT_API_KEY`, `GROQ_API_KEY`). If any credential is not configured, the dependent tests will automatically and cleanly **skip** (`pytest.skip`) without failing the suite.

### Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/backend-tests.yml`) runs the test suite automatically on every `push` and `pull_request` to the `main` or `master` branch.

To enable the full test suite in CI:
1. Navigate to your GitHub repository's **Settings** > **Secrets and variables** > **Actions**.
2. Add the following repository secrets:
   - `QDRANT_URL`: Your Qdrant cluster endpoint.
   - `QDRANT_API_KEY`: Your Qdrant API key (if using Qdrant Cloud).
   - `GROQ_API_KEY`: Your Groq API key.

If these secrets are not configured in your repository, tests requiring live vector search or LLM inference will auto-skip gracefully in CI.

---

## Deployment

Datum is architected for cloud deployment with decoupled frontend and backend services:
- **Backend API**: Hosted on [Render](https://render.com/) (Web Service).
- **Frontend SPA**: Hosted on [Vercel](https://vercel.com/) (Vite Static Site).
- **Dense Vector Store**: Hosted on [Qdrant Cloud](https://cloud.qdrant.io/).
- **LLM Inference**: Provided by [Groq API](https://console.groq.com/).

### Backend Deployment (Render)

1. Create a **New Web Service** connected to your repository.
2. Set **Root Directory** to `backend`.
3. Select **Environment**: `Python 3`.
4. Set **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
5. Set **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   *(A `backend/Procfile` is also provided in the repository).*
6. Configure the following **Environment Variables** in Render:

| Variable | Description | Recommended / Example Value |
|---|---|---|
| `QDRANT_URL` | Qdrant Cloud cluster endpoint | `https://xxxxxx.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `your_qdrant_api_key` |
| `QDRANT_COLLECTION` | Target collection name | `datum_chunks` |
| `EMBEDDING_MODEL` | Hugging Face embedding model | `BAAI/bge-small-en-v1.5` |
| `GROQ_API_KEY` | Groq API key | `gsk_xxxxxxxxxxxx` |
| `GROQ_MODEL` | Groq LLM model name | `qwen/qwen3.8-27b` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,https://your-datum.vercel.app` |
| `UPLOAD_DIR` | Local container upload storage directory | `uploads` |
| `DATABASE_PATH` | SQLite database file path | `datum.db` |
| `MAX_UPLOAD_MB` | Maximum PDF file upload limit | `50` |

> [!WARNING]
> **Known Limitation (Ephemeral Storage on Free Tier)**:
> Render's free tier provides an ephemeral filesystem without persistent disk storage. The SQLite database (`datum.db`) and locally-stored uploaded PDF files (`uploads/`) are reset on every redeploy. Document records, chunk metadata, and chat history will not survive a service redeploy. However, vector embeddings in Qdrant Cloud remain unaffected since Qdrant is an external persistent database. This is an intentional and acceptable trade-off for a free-tier pilot (SQLite for initial pilot, PostgreSQL + object storage for production scale).

### Frontend Deployment (Vercel)

1. Import the repository into **Vercel**.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Configure **Environment Variable**:
   - `VITE_API_URL`: The live URL of your Render backend (e.g. `https://datum-backend.onrender.com`).
5. Deploy. Vercel automatically injects `VITE_API_URL` during `npm run build`.

### Automated Post-Deployment Smoke Test

Once both backend and frontend are deployed, run the automated smoke test script to verify end-to-end operational health without manual browser inspection:

```bash
python backend/scripts/smoke_test_deployed.py \
  --backend-url https://datum-backend.onrender.com \
  --frontend-url https://your-datum.vercel.app
```

Or using environment variables:
```bash
export BACKEND_URL=https://datum-backend.onrender.com
export FRONTEND_URL=https://your-datum.vercel.app
python backend/scripts/smoke_test_deployed.py
```

The script autonomously validates:
1. **Backend Health Check**: Confirms `GET /health` returns 200 with `status: ok`, `qdrant_connected: true`, and `groq_configured: true`.
2. **Frontend Reachability**: Verifies `GET /` returns HTTP 200 and serves the genuine Datum application markup.
3. **Live PDF Ingestion**: Generates and uploads an in-memory synthetic AUTOSAR specification with running headers, verifying section-aware chunking, embeddings, and readiness.
4. **Grounded Q&A Synthesis**: Executes a technical query against the ingested specification, confirming LLM answer synthesis and citation integrity.
5. **Document Cleanup**: Completely deletes the smoke test document, verifying cascade removal from SQLite and Qdrant vector store.

---

## Evaluation

Datum includes an automated evaluation harness in `backend/scripts/run_eval.py` that objectively scores answer groundedness and structural integrity against real AUTOSAR specifications (`AUTOSAR_CP_TPS_ECUResourceTemplate.pdf` and `AUTOSAR_CP_TPS_BSWModuleDescriptionTemplate.pdf`), without requiring manual inspection of each response.

### Running the Evaluation

Ensure the backend server is running and `GROQ_API_KEY` is configured in `backend/.env`:

```bash
# Run against local backend (default: http://127.0.0.1:8000)
python backend/scripts/run_eval.py

# Run against deployed staging or production backend
python backend/scripts/run_eval.py --backend-url https://your-backend.onrender.com

# Custom question set or report output directory
python backend/scripts/run_eval.py --questions backend/eval/questions.json --output-dir backend/eval/results
```

### Evaluation Pass/Fail Criteria

Each question in `backend/eval/questions.json` is evaluated across two independent layers:

1. **Structural Checks (Deterministic, No LLM Needed)**:
   - **In-Scope (Answerable) Questions** (`expect_answerable: true`):
     - Asserts `confidence != "low"`.
     - Asserts `len(citations) > 0` (valid bracket markers `[N]` extracted and mapped to document chunks).
     - Asserts all specified `expected_keywords` appear within the generated answer (case-insensitive substring match).
   - **Out-of-Scope (Unanswerable) Questions** (`expect_answerable: false`):
     - Asserts `confidence == "low"`.
     - Asserts `len(citations) == 0` (no fabricated citations or ungrounded claims).

2. **Groundedness Check (LLM-as-Judge)**:
   - Evaluated independently by Groq (`llama-3.1-8b-instant` or configured `GROQ_MODEL`) with an auditing rubric and temperature `0.0`.
   - Verifies whether **every single factual claim, constraint, and attribute** in the generated answer is directly backed by the cited source excerpts.
   - Forbids outside domain knowledge — even if a claim is true in AUTOSAR in general, if it is absent from the cited excerpts, it is flagged as ungrounded.
   - Outputs strict JSON `{ "grounded": bool, "reasoning": string }`.
   - For out-of-scope questions, groundedness automatically passes if the assistant correctly refused to answer without fabricating claims.

### Reports & Regression Testing

- **Full Detail Report**: Saved to `backend/eval/results/eval_report_{timestamp}.json` with full per-question details (`question`, `answer`, `citations`, `structural_pass`, `grounded_pass`, `judge_reasoning`).
- **Terminal Summary**: Prints a clean plain-text table to `stdout` showing the total questions, structural pass rate, groundedness pass rate, and 1-line diagnostic reasons for any failing questions.
- **Regression Guard**: Can be re-run at any time to verify that prompt updates, chunking modifications, or retrieval changes do not cause hallucinations or structural regressions.

---

## Roadmap

1. **Phase 1: Frontend & Visual Design System** *(Complete)*
   - Three-pane engineering workspace with strict token constraints.
   - Dual Blueprint/Drafting themes with localStorage persistence.
   - Grounded paper-tone evidence drawer with 200ms motion moment.
   - Landing page with authentic AUTOSAR visual previews.

2. **Phase 2: Backend Document Ingestion** *(Complete)*
   - FastAPI microservice with document upload, listing, and deletion endpoints.
   - Hierarchical PDF parsing with PyMuPDF preserving chapter numbers, heading levels, and page bounds.
   - Section-aware chunking (300-450 words, 60-word overlap, hierarchy-preserving forward merge).
   - SQLite persistence for documents and chunks with foreign key cascade.

3. **Phase 3: Dense Retrieval & Vector Database** *(Complete)*
   - In-memory preloaded embedding model (`BAAI/bge-small-en-v1.5`) with batch encoding (size 32).
   - Asymmetric query instruction prefixing for bge models (`Represent this sentence for searching relevant passages: `).
   - Qdrant vector store integration with document-scoped payload filtering and keyword index.
   - Upload pipeline progression (`processing` -> `embedding` -> `ready`) with graceful failure isolation.
   - Retrieval endpoint `POST /documents/{id}/search` for manual retrieval quality inspection.

4. **Phase 4: LLM Generation & Citation Grounding (Groq)** *(Complete)*
   - Groq inference integration (`llama-3.1-8b-instant`) with low temperature (0.1) and rate-limit backoff.
   - Strict grounding system prompt forbidding outside domain assumptions.
   - Automated citation validation stripping ungrounded/invented markers from generated answers.
   - Dual confidence scoring flagging low-relevance retrieval (<0.5) or insufficient document details.
   - Traceability audit log (`chat_history` SQLite table) and `GET /documents/{id}/history` endpoint.

5. **Phase 5: Full-Stack Integration & Safety Traceability** *(In Progress)*
   - Frontend connected to live backend (real upload, retrieval, and generation). *(Complete)*
   - Structured entity extraction (components/ports/interfaces) with export. *(Complete)*
   - Multi-view workspace tab (Conversation vs Structure view). *(Complete)*
   - In-line PDF viewer highlighting exact sentence bounding boxes inside the evidence drawer. *(Upcoming)*
   - Audit trail export for ISO 26262 / ASIL-D tool qualification. *(Upcoming)*

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

