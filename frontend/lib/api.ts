import type {
  ApiError,
  DocumentChunkResponse,
  DocumentExtractionResponse,
  DocumentUploadResponse,
  RagAskRequest,
  RagAskResponse,
  RagSearchRequest,
  RagSearchResponse,
  StudentRagAskResponse,
} from "@/lib/types";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export const API_BASE_URL =
  configuredApiBaseUrl ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const headers = init?.body instanceof FormData
    ? init?.headers
    : {
        "Content-Type": "application/json",
        ...init?.headers,
      };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const apiError: ApiError = {
      message: extractErrorMessage(payload, response.statusText),
      status: response.status,
      details: payload,
    };
    throw apiError;
  }

  return payload as T;
}

export function uploadDocument(formData: FormData) {
  return apiFetch<DocumentUploadResponse>("/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export function extractDocument(documentId: string) {
  return apiFetch<DocumentExtractionResponse>(`/documents/${documentId}/extract`, {
    method: "POST",
  });
}

export function chunkDocument(documentId: string) {
  return apiFetch<DocumentChunkResponse>(`/documents/${documentId}/chunk`, {
    method: "POST",
  });
}

export function searchRag(request: RagSearchRequest) {
  return apiFetch<RagSearchResponse>("/rag/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function askRag(request: RagAskRequest) {
  return apiFetch<RagAskResponse>("/rag/ask", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function askStudentRag(request: RagAskRequest) {
  const response = await fetch("/api/student/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    const apiError: ApiError = {
      message: extractErrorMessage(payload, response.statusText),
      status: response.status,
      details: payload,
    };
    throw apiError;
  }

  return payload as StudentRagAskResponse;
}

export function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw {
      message: "NEXT_PUBLIC_API_BASE_URL is required for deployed frontend API calls.",
      status: 500,
      details: null,
    } satisfies ApiError;
  }
  return API_BASE_URL;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return fallback || "Request failed";
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}
