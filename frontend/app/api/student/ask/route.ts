import { API_BASE_URL } from "@/lib/api";
import type { RagAnswerSource, RagAskResponse, StudentRagAnswerSource, StudentRagAskResponse } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.text();

  const backendResponse = await fetch(`${API_BASE_URL}/rag/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const contentType = backendResponse.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await backendResponse.json()
    : await backendResponse.text();

  if (!backendResponse.ok) {
    return Response.json(payload, { status: backendResponse.status });
  }

  return Response.json(stripTechnicalSourceIds(payload as RagAskResponse));
}

function stripTechnicalSourceIds(response: RagAskResponse): StudentRagAskResponse {
  return {
    ...response,
    sources: response.sources.map(stripSourceTechnicalIds),
  };
}

function stripSourceTechnicalIds(source: RagAnswerSource): StudentRagAnswerSource {
  const safeSource: Partial<RagAnswerSource> = { ...source };
  delete safeSource.chunk_id;
  delete safeSource.document_id;
  return safeSource as StudentRagAnswerSource;
}
