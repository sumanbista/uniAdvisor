# uniAdvisor

uniAdvisor is an evidence-first academic advising RAG system for Computer Science advising documents. It lets advisors upload source documents, process them into searchable evidence, inspect retrieved chunks, and generate grounded answers with confidence scores, citations, advisor notes, and safe refusal behavior.

It focuses on uploaded Computer Science documents only and does not claim to replace an advisor, registrar, transcript review, prerequisite checker, or official degree audit.

## Phase 1 Status

Completed:

- Data model for documents, chunks, RAG queries, and feedback
- Document upload for `.pdf`, `.txt`, and `.md`
- Text extraction, chunking, content hashing, and embeddings
- PostgreSQL + pgvector semantic search
- Groq-backed grounded answer generation
- Backend-derived `confidence_score`
- Advisor Console at `/`
- Student View at `/student`
- Source references, advisor notes, refusal handling, and query logging
- QA validation for backend tests, compile, frontend lint, and frontend build

## Architecture

```text
Uploaded CS document
-> stored source file
-> extracted text
-> document chunks
-> embeddings
-> PostgreSQL + pgvector
-> /rag/search retrieves evidence
-> /rag/ask sends evidence to the LLM
-> answer, confidence_score, sources, advisor note, and query log
```

Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL, pgvector, sentence-transformers, pypdf, Groq, pytest.

Frontend: Next.js, TypeScript, Tailwind CSS, and shadcn/ui-style components.

## Routes

Backend:

```text
POST /documents/upload
POST /documents/{document_id}/extract
POST /documents/{document_id}/chunk
POST /rag/search
POST /rag/ask
```

Frontend:

```text
/          Advisor Console
/student   Student View
```

## Local Setup

Backend:

```bash
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Use `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` for the frontend and configure the backend `.env` with `COURSECOMPASS_DATABASE_URL`, `GROQ_API_KEY`, and `COURSECOMPASS_GROQ_MODEL`.

## Demo Flow

Advisor Console:

1. Open `/`.
2. Show the evidence-first pipeline: Documents, Search, Ask.
3. Upload a Computer Science advising document.
4. Run text extraction.
5. Run chunking.
6. Search for a known requirement and inspect retrieved evidence.
7. Ask a grounded advising question.
8. Show the answer, backend-derived confidence score, advisor note, and source references.

Student View:

1. Open `/student`.
2. Select a starter question or type a CS advising question.
3. Submit the question.
4. Show the simplified answer, confidence ribbon, advisor guidance, and student-friendly sources.

Safe refusal behavior:

1. Ask a high-impact question such as "Can I graduate next semester?"
2. Confirm the answer is shown as academic guidance, not a system error.
3. Point out that official graduation, registration, prerequisite, and degree-audit decisions require advisor or registrar review.

## Example Questions

Use questions that match uploaded CS advising documents:

```text
What are the Computer Science major requirements?
What math courses are required for the CS major?
What does the four-year plan recommend for the first year?
What electives are listed for the CS major?
Where is this requirement mentioned?
```

Safe refusal examples:

```text
Can I graduate next semester?
Am I officially eligible to register for this course?
Do I satisfy all degree requirements?
Can you approve my degree audit?
```

## Current Limitations

- Computer Science documents only
- Uploaded documents only
- No transcript access
- No official degree audit
- No registration approval
- No student profile
- No prerequisite checker yet
- No semester planner yet
- No multi-tool agent yet
- No deployment details are documented for Phase 1

## Validation

Expected Phase 1 validation:

```bash
.venv/bin/python -m pytest
.venv/bin/python -m compileall backend
cd frontend
npm run lint
npm run build
```

Current expected results:

```text
backend tests: 47 passed, 1 skipped
backend compile: passed
frontend lint: passed
frontend build: passed
```

## Screenshot Checklist

Screenshots are optional for the repository. If captured later, place committed assets under `docs/assets/`.

- Advisor Console overview
- Documents tab before upload
- Document processed or ready state
- Search tab with retrieved evidence
- Ask tab with grounded answer
- Ask tab refusal/advisor guidance
- Student View empty state
- Student View grounded answer
- Student View source references

## Roadmap

Next phases may add authenticated users, broader document domains, transcript-aware workflows, prerequisite checking, semester planning, official degree-audit integrations, and multi-tool advising agents. Phase 1 intentionally stops at grounded document understanding and clear safety boundaries.
