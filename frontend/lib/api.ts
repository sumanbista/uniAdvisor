import type {
  ApiError,
  DocumentChunkResponse,
  DocumentExtractionResponse,
  DocumentUploadResponse,
  RagSearchRequest,
  RagSearchResponse,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = init?.body instanceof FormData
    ? init?.headers
    : {
        "Content-Type": "application/json",
        ...init?.headers,
      };

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
