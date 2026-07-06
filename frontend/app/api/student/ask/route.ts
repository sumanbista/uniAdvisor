import {
  BACKEND_UNAVAILABLE_MESSAGE,
  createApiError,
  fetchWithTimeout,
  getApiBaseUrl,
  parseResponsePayload,
} from "@/lib/api";
import type {
  ApiError,
  RagAnswerSource,
  RagAskResponse,
  StudentRagAnswerSource,
  StudentRagAskResponse,
} from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.text();

  let backendResponse: Response;
  try {
    backendResponse = await fetchWithTimeout(`${getApiBaseUrl()}/rag/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
  } catch (caught) {
    const apiError = caught as Partial<ApiError>;
    return Response.json(
      { detail: apiError.message ?? BACKEND_UNAVAILABLE_MESSAGE },
      { status: apiError.status ?? 503 },
    );
  }

  const payload = await parseResponsePayload(backendResponse);

  if (!backendResponse.ok) {
    const apiError = createApiError(backendResponse.status, payload, backendResponse.statusText);
    return Response.json({ detail: apiError.message }, { status: backendResponse.status });
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
