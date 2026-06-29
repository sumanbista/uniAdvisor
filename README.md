# uniAdvisor Phase 1 Backend

Phase 1 supports document upload, text extraction, chunking with embeddings, pgvector search, grounded answer generation, and RAG query logging.

## Setup

Create or update the local environment:

```bash
.venv/bin/python -m pip install -e '.[dev]'
```

Copy `.env.example` to `.env` and set:

```bash
COURSECOMPASS_DATABASE_URL=postgresql+psycopg://...
GROQ_API_KEY=gsk_...
COURSECOMPASS_GROQ_MODEL=qwen/qwen3-32b
```

Optional settings:

```bash
COURSECOMPASS_DOCUMENT_STORAGE_DIR=backend/storage/documents
COURSECOMPASS_EXTRACTED_TEXT_DIR=backend/storage/extracted
COURSECOMPASS_ALLOWED_UPLOAD_EXTENSIONS=.pdf,.txt,.md
COURSECOMPASS_CHUNK_SIZE=1000
COURSECOMPASS_CHUNK_OVERLAP=200
```

## Run Locally

```bash
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

Open Swagger at `http://127.0.0.1:8000/docs`.

## Manual Phase 1 Flow

1. `POST /documents/upload`
2. `POST /documents/{document_id}/extract`
3. `POST /documents/{document_id}/chunk`
4. `POST /rag/search`
5. `POST /rag/ask`

`/rag/search` returns retrieved chunks only. `/rag/ask` sends retrieved chunk text to the configured Groq model and logs the query in `rag_queries`.

## Validation

```bash
.venv/bin/python -m pytest
.venv/bin/python -m compileall backend
```
