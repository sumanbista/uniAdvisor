# Frontend Deployment Setup

This milestone covers only the Next.js frontend deployment path for Vercel. It does not add product features, auth, profiles, prerequisite tools, degree audit logic, agents, signed URLs, direct frontend-to-Supabase uploads, or UI redesigns.

## Vercel Project Settings

Use these Vercel settings:

```text
Framework Preset: Next.js
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output Directory: leave default / auto-detected
```

Do not manually set an output directory unless Vercel's Next.js auto-detection is intentionally being overridden.

## Required Environment Variable

Set this in the Vercel project environment:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend-url.onrender.com
```

This URL must point to the deployed Render backend. Local development may use:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Only `NEXT_PUBLIC_API_BASE_URL` should be exposed to the browser. Do not add Supabase service role keys, Groq API keys, database URLs, or backend-only secrets to Vercel frontend env vars.

If `NEXT_PUBLIC_API_BASE_URL` is missing in production, frontend API calls fail with a readable configuration error instead of silently calling localhost.

## API Routing

Advisor Console browser calls use `NEXT_PUBLIC_API_BASE_URL` for:

```text
POST /documents/upload
POST /documents/{document_id}/extract
POST /documents/{document_id}/chunk
POST /rag/search
POST /rag/ask
```

Student View also uses `NEXT_PUBLIC_API_BASE_URL` for:

```text
POST /rag/ask
```

The legacy same-origin route `POST /api/student/ask` may remain for backwards compatibility, but runtime Student View UI should not call it. Long Student Ask requests should go directly from the browser to the Render backend `/rag/ask` endpoint to avoid Vercel function timeouts. The frontend does not call Supabase or Groq directly.

## Routes

Verify both routes after deployment:

```text
/          Advisor Console
/student   Student View
```

Expected:

* `/` loads the Advisor Console.
* `/student` loads the Student View.
* Header navigation works between both routes.
* Refreshing `/student` does not return a 404.

## Backend CORS Coordination

After the Vercel URL is known, update the Render backend environment variable:

```env
BACKEND_CORS_ORIGINS=https://your-vercel-frontend-domain.vercel.app,http://localhost:3000
```

Restart or redeploy the backend if Render does not apply the environment change automatically. Do not use unrestricted `*` in production unless temporarily debugging.

## Frontend Smoke Test

After Vercel deployment:

1. Open `/`.
2. Open `/student`.
3. Confirm header navigation works.
4. Refresh `/student` and confirm it does not 404.
5. Confirm the backend `/health` URL works separately.
6. Upload a small `.txt` document from Advisor Console.
7. Extract the document.
8. Chunk the document.
9. Search a known phrase.
10. Ask a known grounded question.
11. Verify sources appear.
12. Ask a high-impact graduation question.
13. Verify safe refusal or advisor guidance.
14. From `/student`, ask a question and confirm the browser Network tab shows `https://your-render-backend-url.onrender.com/rag/ask`, not `https://your-vercel-domain/api/student/ask`.

Expected:

* The frontend loads successfully.
* API calls go to the deployed Render backend.
* There are no browser CORS errors.
* No production API calls go to localhost.
* No frontend secrets are exposed.
* Advisor Console works.
* Student View works.

## Validation

Run from `frontend/`:

```bash
npm run lint
npm run build
```
