# uniAdvisor Frontend

Phase 1 frontend foundation for the Computer Science advising RAG demo.

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

The Phase 1 UI is being built incrementally. This foundation includes the app
shell, dashboard tabs, placeholders, shared types, and generic API client only.
