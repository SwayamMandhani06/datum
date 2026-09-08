from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, CORS_ORIGINS
from app.routes import documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to run startup tasks and database initialization."""
    await init_db()
    yield


app = FastAPI(
    title="Datum Document Ingestion API",
    description="FastAPI service for AUTOSAR HLD document parsing and section-aware chunking.",
    version="0.1.0",
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
    """Healthcheck endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "datum-backend",
        "phase": "ingestion-and-chunking",
    }
