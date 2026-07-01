"""
services/embedding_service.py
------------------------------
Embedding generation and vector search using sentence-transformers (local)
and pgvector via ``langchain-postgres``'s PGVectorStore.

Key design decisions:
    • Embeddings run locally with all-MiniLM-L6-v2 (384 dims) — no API cost.
    • PGVectorStore from langchain-postgres manages the vector table and queries.
    • Async throughout: ``aadd_documents``, ``asimilarity_search_with_score``.
    • Search is scoped by user_id via metadata filtering.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGEngine, PGVectorStore

from core.settings import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level singletons (lazy-initialised)
# ---------------------------------------------------------------------------

_embeddings: HuggingFaceEmbeddings | None = None
_vector_store: PGVectorStore | None = None
_pg_engine: PGEngine | None = None

VECTOR_TABLE_NAME = "resume_embeddings"


def _get_embeddings() -> HuggingFaceEmbeddings:
    """Lazy-init the sentence-transformers embedding model."""
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
            huggingfacehub_api_token=settings.HF_TOKEN
        )
        logger.info("Loaded embedding model: %s", settings.EMBEDDING_MODEL)
    return _embeddings


async def _get_pg_engine() -> PGEngine:
    """Lazy-init the PGEngine for langchain-postgres."""
    global _pg_engine
    if _pg_engine is None:
        _pg_engine = PGEngine.from_connection_string(url=settings.DB_URL)
        # Create the vector table if it doesn't exist
        await _pg_engine.ainit_vectorstore_table(
            table_name=VECTOR_TABLE_NAME,
            vector_size=settings.EMBEDDING_DIMENSIONS,
            metadata_columns=[],  # metadata stored as JSONB by default
        )
        logger.info(
            "PGEngine initialised — table=%s vector_size=%d",
            VECTOR_TABLE_NAME,
            settings.EMBEDDING_DIMENSIONS,
        )
    return _pg_engine


async def _get_vector_store() -> PGVectorStore:
    """Lazy-init the PGVectorStore."""
    global _vector_store
    if _vector_store is None:
        engine = await _get_pg_engine()
        _vector_store = await PGVectorStore.create(
            engine=engine,
            table_name=VECTOR_TABLE_NAME,
            embedding_service=_get_embeddings(),
        )
        logger.info("PGVectorStore ready (table=%s)", VECTOR_TABLE_NAME)
    return _vector_store


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def store_resume_embedding(
    task_id: UUID,
    user_id: str,
    text: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Generate an embedding for the resume text and upsert it into pgvector.

    Parameters
    ----------
    task_id : UUID
        The task this resume belongs to (used as the document ID for upserts).
    user_id : str
        Owner's UUID string — stored in metadata for filtered search.
    text : str
        The raw resume text to embed.
    metadata : dict, optional
        Extra metadata (name, email, skills, etc.) stored alongside the vector.
    """
    store = await _get_vector_store()

    doc_metadata = {"task_id": str(task_id), "user_id": user_id}
    if metadata:
        doc_metadata.update(metadata)

    doc = Document(page_content=text, metadata=doc_metadata)

    await store.aadd_documents([doc], ids=[str(task_id)])

    logger.info("Stored embedding for task_id=%s (user_id=%s)", task_id, user_id)


async def search_similar_resumes(
    query: str,
    user_id: UUID,
    k: int = 5,
) -> list[dict[str, Any]]:
    """
    Semantic search across the authenticated user's parsed resumes.

    Parameters
    ----------
    query : str
        Job description, skill set, or free-text query.
    user_id : UUID
        Only resumes belonging to this user are searched.
    k : int
        Number of top results to return.

    Returns
    -------
    list[dict]
        Each dict contains: task_id, name, email, skills, score, snippet.
    """
    store = await _get_vector_store()

    results = await store.asimilarity_search_with_score(
        query,
        k=k,
        filter={"user_id": str(user_id)},
    )

    return [
        {
            "task_id": doc.metadata.get("task_id", ""),
            "name": doc.metadata.get("name"),
            "email": doc.metadata.get("email"),
            "skills": doc.metadata.get("skills"),
            "score": round(float(score), 4),
            "snippet": doc.page_content[:500],
        }
        for doc, score in results
    ]
