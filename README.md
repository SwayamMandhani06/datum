# Datum &nbsp;·&nbsp; AUTOSAR HLD Intelligence

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-6366f1?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/tests-17%20passing-10b981?style=flat-square" alt="17 Tests Passing" />
  <img src="https://img.shields.io/badge/hallucinations-0-10b981?style=flat-square" alt="Zero Hallucinations" />
  <img src="https://img.shields.io/badge/backend-FastAPI-0ea5e9?style=flat-square" alt="FastAPI" />
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-8b5cf6?style=flat-square" alt="React + Vite" />
  <img src="https://img.shields.io/badge/LLM-Groq%20%2F%20Llama--3-f59e0b?style=flat-square" alt="Groq LLM" />
  <img src="https://img.shields.io/badge/vectors-Qdrant-6366f1?style=flat-square" alt="Qdrant" />
</p>

<p align="center">
  <strong>Every answer, traced back to the exact page it came from.</strong><br/>
  Datum reads AUTOSAR High-Level Design specifications and answers engineering questions<br/>
  with the exact section, page number, and verbatim excerpt behind every claim.
</p>

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Citation-Grounded Q&A** | Every factual claim links to an exact chunk — section heading, page range, and verbatim excerpt |
| **Zero Hallucinations** | The LLM is constrained to only use content from your document — never outside knowledge |
| **Section-Aware Chunking** | Hierarchical PDF parsing preserves chapter structure across 380+ page AUTOSAR specs |
| **Structural Extraction** | Auto-classify every component, port, interface, and signal with CSV/JSON export |
| **Conversation History** | All Q&A exchanges are persisted in SQLite and restored on reload |
| **Health Monitoring** | `/health` endpoint verifies Qdrant and Groq connectivity for production uptime checks |
| **Automated Eval Harness** | `eval/runner.py` scores answer groundedness against a curated AUTOSAR question set |

---

## 🏗 Architecture

```
datum/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, startup
│   │   ├── database.py       # SQLite + settings
│   │   ├── models.py         # Pydantic schemas
│   │   ├── ingestion.py      # PDF parsing, section-aware chunking
│   │   ├── embeddings.py     # HuggingFace sentence-transformers
│   │   ├── vector_store.py   # Qdrant vector DB interface
│   │   ├── qa.py             # Citation-grounded Q&A (Groq)
│   │   └── extraction.py     # Full-doc structural extraction
│   ├── tests/                # Pytest suite (17 tests)
│   ├── eval/                 # Groundedness evaluation harness
│   └── requirements.txt
│
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.ts     # Typed API client
│   │   ├── components/       # UI components
│   │   ├── pages/            # Landing + Workspace
│   │   ├── context/          # Theme context
│   │   └── types.ts          # Shared TypeScript types
│   └── tailwind.config.js
│
├── AUDIT_REPORT.md           # Full system audit findings
├── LICENSE                   # MIT License
└── README.md
```

```
User  →  React Frontend  →  FastAPI Backend  →  HuggingFace Embeddings
                                          ↓
                                    Qdrant Vector Store
                                          ↓
                                   Top-k Chunk Retrieval
                                          ↓
                                  Groq (Llama-3.3-70B)
                                          ↓
                              Citation-Grounded Answer
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq API Key](https://console.groq.com)

### 1 — Clone

```bash
git clone https://github.com/SwayamMandhani06/datum.git
cd datum
```

### 2 — Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here

# Optional — defaults to in-memory Qdrant
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=your_qdrant_cloud_key

# Optional — defaults to ./uploads and ./datum.db
UPLOAD_DIR=./uploads
DATABASE_PATH=./datum.db

# Optional — comma-separated list of allowed frontend origins
CORS_ORIGINS=http://localhost:5173,https://your-deployed-frontend.com
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 3 — Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## ✅ Running the Test Suite

```bash
cd backend
pytest tests/ -v
```

Expected output: **17 tests pass** covering:
- PDF ingestion and section-aware chunking
- Header exclusion (deduplication fix)
- Embedding generation and vector storage
- Qdrant round-trip search
- Citation-grounded Q&A endpoint
- Structural extraction entities
- Health check endpoint

---

## 🧪 Evaluation Harness

```bash
cd backend
python eval/runner.py
```

Scores each question in `eval/questions.json` for:
- **Answerable** questions: checks expected keywords appear in the response
- **Out-of-scope** questions: verifies the model correctly refuses

---

## 🌐 API Reference

Interactive docs at **http://localhost:8000/docs** (Swagger UI).

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | System health check (Qdrant + Groq) |
| `GET` | `/documents` | List all indexed documents |
| `POST` | `/documents/upload` | Upload and index a PDF |
| `DELETE` | `/documents/{id}` | Delete a document and its vectors |
| `GET` | `/documents/{id}/chunks` | List all text chunks for a document |
| `GET` | `/documents/{id}/history` | Get Q&A conversation history |
| `POST` | `/documents/{id}/ask` | Ask a grounded question |
| `GET` | `/documents/{id}/extract` | Run structural entity extraction |
| `GET` | `/documents/{id}/export/{format}` | Export entities as CSV or JSON |

---

## 🔧 LLM Configuration

| Setting | Default | Description |
|---|---|---|
| Model | `llama-3.3-70b-versatile` | Groq model used for Q&A and extraction |
| Top-k retrieval | 6 chunks | Number of relevant chunks retrieved per question |
| Max batches | 8 | Maximum extraction batches per document |
| Temperature | 0.1 | Near-deterministic for factual precision |

---

## 🛡 Design Decisions

### Why no streaming?
Streaming would prevent the backend from verifying that all citations are grounded before sending a response. Correctness takes priority over perceived speed.

### Why SQLite instead of PostgreSQL?
This is a local-first tool. SQLite is zero-infrastructure and sufficient for single-user workloads. Swap to PostgreSQL via `DATABASE_URL` when deploying multi-user.

### Why sentence-transformers over OpenAI embeddings?
Fully offline, no API cost, privacy-preserving for proprietary AUTOSAR documents. The `all-MiniLM-L6-v2` model is fast and effective for technical specification text.

---

## 📁 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | — | Groq Cloud API key |
| `QDRANT_URL` | ❌ | in-memory | Qdrant server URL |
| `QDRANT_API_KEY` | ❌ | — | Qdrant Cloud API key |
| `UPLOAD_DIR` | ❌ | `./uploads` | Directory for uploaded PDFs |
| `DATABASE_PATH` | ❌ | `./datum.db` | SQLite database file path |
| `CORS_ORIGINS` | ❌ | `http://localhost:5173` | Comma-separated allowed origins |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | ✅ | `http://localhost:8000` | Backend base URL |

---

## 🚢 Deployment

### Backend (Render / Railway / Fly.io)

```bash
# Start command
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set all required environment variables in your host's dashboard.

> ⚠️ **Ephemeral disk warning**: Render free-tier instances reset the filesystem on deploy. Use Qdrant Cloud for persistent vectors and mount a volume for `UPLOAD_DIR`.

### Frontend (Vercel / Netlify)

```bash
npm run build
# Deploy the ./dist directory
```

Set `VITE_API_URL` to your backend's public URL in the host's environment settings.

---

## 🔍 Post-Deployment Smoke Test

```bash
cd backend
python eval/smoke_test.py --url https://your-backend.onrender.com
```

---

## 📋 Audit Report

A complete system audit is documented in [`AUDIT_REPORT.md`](./AUDIT_REPORT.md), covering:
- Pipeline correctness (all 17 tests)
- Auto-fixed bugs (Groq model deprecated default, Qdrant timeouts)
- Flagged design decisions (ephemeral storage, rate limiting)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run the test suite: `cd backend && pytest tests/ -v`
4. Submit a pull request

Please keep PRs focused. One feature or bug fix per PR.

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for full text.

---

<p align="center">Built with FastAPI · React · Groq · Qdrant · HuggingFace · Python</p>
