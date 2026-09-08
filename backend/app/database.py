import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator, List
import aiosqlite
from dotenv import load_dotenv

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Configurations
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = (BASE_DIR / UPLOAD_DIR).resolve()

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "datum.db")))
if not DATABASE_PATH.is_absolute():
    DATABASE_PATH = (BASE_DIR / DATABASE_PATH).resolve()

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "50"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Parse CORS Origins
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ORIGINS: List[str] = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Provide an async database connection context with foreign keys enabled."""
    db = await aiosqlite.connect(str(DATABASE_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON;")
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    """Initialize SQLite database tables and indexes."""
    async with get_db() as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                upload_date TEXT NOT NULL,
                page_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                error_message TEXT
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                section_title TEXT,
                page_start INTEGER NOT NULL,
                page_end INTEGER NOT NULL,
                text TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        await db.execute("CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks (document_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc_chunk_idx ON chunks (document_id, chunk_index);")
        await db.commit()
