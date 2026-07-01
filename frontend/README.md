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

## Development

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

The Phase 1 UI is being built incrementally as an evidence-first document
intelligence console. It currently supports document processing, source
retrieval, grounded ask responses, source references, and shared frontend API
types.

Routes:

```text
/          Advisor/admin evidence console
/student   Student-facing source-backed Q&A
```
