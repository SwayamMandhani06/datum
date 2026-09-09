import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, CORS_ORIGINS, GROQ_API_KEY
from app.embeddings import init_embedding_model
from app.vectorstore import init_vectorstore, check_vectorstore_health
from app.routes import documents

logger = logging.getLogger("datum.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to run startup tasks and service initialization."""
    # 1. Initialize SQLite database
    await init_db()

    # 2. Warm up embedding model in memory
    try:
        init_embedding_model()
    except Exception as e:
        logger.error(f"Failed to initialize embedding model: {e}")

    # 3. Validate Qdrant connection and ensure collection exists
    init_vectorstore()

    yield


app = FastAPI(
    title="Datum Document Ingestion & Retrieval API",
    description="FastAPI service for AUTOSAR HLD document parsing, section-aware chunking, and dense vector retrieval.",
    version="0.2.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router)


@app.get("/health", tags=["health"])
async def health_check():
    """Healthcheck endpoint for monitoring and post-deployment smoke tests."""
    qdrant_ok = check_vectorstore_health()
    groq_ok = bool(GROQ_API_KEY and GROQ_API_KEY.strip())
    status_str = "ok" if (qdrant_ok and groq_ok) else "degraded"
    return {
        "status": status_str,
        "qdrant_connected": qdrant_ok,
        "groq_configured": groq_ok,
    }

