"""Document ingestion and retrieval for FinVision Research Assistant.

The current retriever is deterministic and dependency-free so local demos and CI
remain hermetic. The ``Retriever`` protocol is the seam for a pgvector-backed
implementation in production.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Document:
    document_id: str
    title: str
    source_url: str
    symbol: str | None
    published_at: str | None
    text: str


@dataclass(frozen=True)
class DocumentChunk:
    chunk_id: str
    document_id: str
    title: str
    source_url: str
    symbol: str | None
    published_at: str | None
    text: str
    position: int


@dataclass(frozen=True)
class RetrievedChunk:
    chunk: DocumentChunk
    score: float


class Retriever(Protocol):
    def search(self, query: str, symbol: str | None = None, limit: int = 5) -> list[RetrievedChunk]:
        ...


def chunk_document(document: Document, max_words: int = 180, overlap: int = 30) -> list[DocumentChunk]:
    """Split a document into bounded, overlapping chunks with source metadata."""
    if max_words <= 0 or overlap < 0 or overlap >= max_words:
        raise ValueError("overlap must be non-negative and smaller than max_words")
    words = document.text.split()
    chunks: list[DocumentChunk] = []
    step = max_words - overlap
    for position, start in enumerate(range(0, len(words), step)):
        text = " ".join(words[start : start + max_words]).strip()
        if not text:
            continue
        chunks.append(
            DocumentChunk(
                chunk_id=f"{document.document_id}:{position}",
                document_id=document.document_id,
                title=document.title,
                source_url=document.source_url,
                symbol=document.symbol,
                published_at=document.published_at,
                text=text,
                position=position,
            )
        )
    return chunks


class InMemoryRetriever:
    """Deterministic baseline retriever used for demos and evaluation tests."""

    def __init__(self, chunks: list[DocumentChunk] | None = None):
        self._chunks = list(chunks or [])

    def add_document(self, document: Document) -> int:
        new_chunks = chunk_document(document)
        self._chunks.extend(new_chunks)
        return len(new_chunks)

    def search(self, query: str, symbol: str | None = None, limit: int = 5) -> list[RetrievedChunk]:
        terms = set(_terms(query))
        if not terms or limit <= 0:
            return []
        scored: list[RetrievedChunk] = []
        for chunk in self._chunks:
            if symbol and chunk.symbol and chunk.symbol.upper() != symbol.upper():
                continue
            chunk_terms = set(_terms(f"{chunk.title} {chunk.text}"))
            overlap = terms & chunk_terms
            if not overlap:
                continue
            score = len(overlap) / len(terms)
            if chunk.symbol and symbol:
                score += 0.25
            scored.append(RetrievedChunk(chunk=chunk, score=score))
        scored.sort(key=lambda item: (-item.score, item.chunk.document_id, item.chunk.position))
        return scored[:limit]


def _terms(text: str) -> list[str]:
    return [term for term in re.findall(r"[a-z0-9]{3,}", text.lower()) if term not in _STOP_WORDS]


_STOP_WORDS = {"the", "and", "for", "that", "with", "what", "did", "this", "from", "about", "latest"}