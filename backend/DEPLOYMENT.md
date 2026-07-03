# Backend Deployment Setup

This milestone covers only the FastAPI backend deployment path for Render. It does not add frontend deployment, auth, profiles, prerequisite tools, degree audit logic, agents, signed URLs, file preview/download UI, or direct frontend-to-Supabase uploads.

## Render Web Service

Use the repo root as the Render root directory.

```text
Service type: Web Service
Environment: Python
Root directory: repo root
Build command: pip install -r backend/requirements.txt
Start command: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
Health check path: /health
```

If Render is configured with `backend/` as the root directory instead, use:

```text
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check path: /health
```

The repo contains both `backend/` and `frontend/`, so the Render build should prefer `backend/requirements.txt` instead of relying on `pip install -e .` from the repo root.

## Health Check

Render can use:

```http
GET /health
```

Expected response:

```json
{"status":"ok"}
```

The health check is intentionally lightweight. It does not call Supabase, Groq, the database, storage, or the embedding model.

## Required Environment Variables

Database:

```env
COURSECOMPASS_DATABASE_URL=postgresql+psycopg://...
```

Use the Supabase Postgres connection string from the dashboard Connect flow. The backend normalizes `postgresql://` and `postgres://` URLs to the installed `psycopg` SQLAlchemy driver form.

Storage:

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=uniadvisor-documents
```

`SUPABASE_SERVICE_ROLE_KEY` is backend-only. It bypasses Supabase RLS and must never be committed, exposed to frontend code, or placed in a `NEXT_PUBLIC_*` variable.

LLM:

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
```

Backend runtime tuning:

```env
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
BACKEND_CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

The app also accepts the older project-prefixed aliases `COURSECOMPASS_GROQ_MODEL`, `COURSECOMPASS_CHUNK_SIZE`, `COURSECOMPASS_CHUNK_OVERLAP`, and `COURSECOMPASS_CORS_ORIGINS`, but the Render-facing names above are preferred for deployment.

## Supabase Postgres Setup

1. Enable the `vector` extension in Supabase.
2. Set `COURSECOMPASS_DATABASE_URL` to the Supabase Postgres connection string.
3. Run Alembic migrations against that database before smoke testing the app.

The backend stores:

```text
documents
document_chunks
rag_queries
rag_feedback
```

## Supabase Storage Setup

1. Open the Supabase project.
2. Create a private Storage bucket named `uniadvisor-documents`.
3. Set `STORAGE_PROVIDER=supabase`.
4. Set `SUPABASE_URL`, backend-only `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=uniadvisor-documents`.

Object paths:

```text
uploads/{document_id}/{safe_filename}
extracted/{document_id}.txt
```

The frontend should not upload directly to Supabase in this phase. All uploads go through the FastAPI backend.

## CORS

Set `BACKEND_CORS_ORIGINS` to a comma-separated allowlist:

```env
BACKEND_CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.vercel.app
```

Do not use unrestricted `*` in production unless temporarily debugging.

See `frontend/DEPLOYMENT.md` for the Vercel frontend setup. After Vercel assigns the production domain, add that exact origin here and restart or redeploy the backend if needed.

## Migrations

Run migrations manually after configuring the production database:

```bash
alembic upgrade head
```

From a local checkout using the project virtual environment:

```bash
.venv/bin/python -m alembic upgrade head
```

Do not run migrations automatically on every backend startup unless that is intentionally configured later.

## Backend Smoke Test

After deployment:

1. `GET /health` returns `{"status":"ok"}`.
2. `POST /documents/upload` with a small `.txt` succeeds.
3. The uploaded file appears in Supabase Storage under `uploads/`.
4. `POST /documents/{document_id}/extract` succeeds.
5. Extracted text appears in Supabase Storage under `extracted/`.
6. `POST /documents/{document_id}/chunk` succeeds and stores chunks in Supabase Postgres.
7. `POST /rag/search` with a known phrase returns real chunks.
8. `POST /rag/ask` with a known question returns a grounded answer and sources.
9. `POST /rag/ask` with a high-impact graduation question returns safe refusal or advisor guidance.

## Validation

Before deploying:

```bash
.venv/bin/python -m pytest
.venv/bin/python -m compileall backend
```
