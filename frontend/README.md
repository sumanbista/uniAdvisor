# uniAdvisor Frontend

Phase 1 evidence-first frontend for the Computer Science advising RAG demo.

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Setup

```bash
npm install
cp .env.example .env.local
```

Required environment variable:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For Vercel, set `NEXT_PUBLIC_API_BASE_URL` to the deployed Render backend URL, for example:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend-url.onrender.com
```

Do not put Supabase service role keys, Groq API keys, database URLs, or other backend-only secrets in Vercel frontend environment variables.

## Development

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Vercel Deployment

See `frontend/DEPLOYMENT.md` for the deployment checklist.

Recommended Vercel settings:

```text
Framework Preset: Next.js
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output Directory: leave default / auto-detected
```

After the Vercel domain is known, add it to the backend Render `BACKEND_CORS_ORIGINS` allowlist.

The Phase 1 UI is being built incrementally as an evidence-first document
intelligence console. It currently supports document processing, source
retrieval, grounded ask responses, source references, and shared frontend API
types.

Routes:

```text
/          Advisor/admin evidence console
/student   Student-facing source-backed Q&A
```

The Advisor Console lets advisors use Search and Ask against documents already
indexed in the backend. The pipeline rail still marks newly performed workflow
steps complete only after each real API step succeeds in the current session.

The `/student` route uses the same live `/rag/ask` backend path as the advisor
ask panel. Starter chips only fill the question field; submitting calls
`askRag()` with the default Computer Science filters and `top_k = 5`.

## Demo Flow

Advisor Console:

1. Open `/`.
2. Upload a Computer Science advising document.
3. Run extraction and chunking.
4. Search for a known requirement and inspect retrieved evidence.
5. Ask a grounded question and review the answer, confidence ribbon, advisor note, and source references.
6. Ask a high-impact question and confirm it appears as safe academic guidance rather than a system error.

Student View:

1. Open `/student`.
2. Choose a starter question or type a CS advising question.
3. Submit the question.
4. Review the simplified answer, backend-derived confidence score, advisor guidance, and student-friendly sources.

Example grounded questions:

```text
What are the Computer Science major requirements?
What math courses are required for the CS major?
What does the four-year plan recommend for the first year?
What electives are listed for the CS major?
```

Safe refusal examples:

```text
Can I graduate next semester?
Am I officially eligible to register for this course?
Do I satisfy all degree requirements?
```

## Current Limitations

The frontend presents Phase 1 as a document-grounded demo only: Computer
Science documents, uploaded sources, no transcript access, no official degree
audit, no prerequisite checker, no semester planner, and no multi-tool agent.
