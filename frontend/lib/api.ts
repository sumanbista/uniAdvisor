import type {
  ApiError,
  DocumentChunkResponse,
  DocumentExtractionResponse,
  DocumentUploadResponse,
  RagAskRequest,
  RagAskResponse,
  RagSearchRequest,
  RagSearchResponse,
} from "@/lib/types";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export const API_BASE_URL =
  configuredApiBaseUrl ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
export const API_REQUEST_TIMEOUT_MS = 35_000;
export const BACKEND_UNAVAILABLE_MESSAGE =
  "The advising backend is unavailable right now. Please make sure the backend is running and try again.";
export const REQUEST_TIMEOUT_MESSAGE =
  "The request timed out. The backend may be starting up or unavailable. Please try again.";

const BACKEND_UNAVAILABLE_STATUSES = new Set([404, 502, 503, 504]);

type TimeoutRequestInit = RequestInit & {
  timeoutMs?: number;
};

export async function apiFetch<T>(path: string, init?: TimeoutRequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const { timeoutMs, ...fetchInit } = init ?? {};
  const headers = init?.body instanceof FormData
    ? init?.headers
    : {
        "Content-Type": "application/json",
        ...init?.headers,
      };

  const response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
    ...fetchInit,
    headers,
    timeoutMs,
  });

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw createApiError(response.status, payload, response.statusText);
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

export async function fetchWithTimeout(input: RequestInfo | URL, init?: TimeoutRequestInit) {
  const { timeoutMs = API_REQUEST_TIMEOUT_MS, signal, ...fetchInit } = init ?? {};
  const timeout = createTimeoutSignal(timeoutMs, signal ?? undefined);

  try {
    return await fetch(input, {
      ...fetchInit,
      signal: timeout.signal,
    });
  } catch (caught) {
    throw createFetchError(caught, timeout.didTimeout());
  } finally {
    timeout.cleanup();
  }
}

export function createApiError(status: number, payload: unknown, fallback: string): ApiError {
  return {
    message: getUserFacingErrorMessage(status, payload, fallback),
    status,
    details: payload,
  };
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

function getUserFacingErrorMessage(status: number, payload: unknown, fallback: string): string {
  if (BACKEND_UNAVAILABLE_STATUSES.has(status)) {
    return BACKEND_UNAVAILABLE_MESSAGE;
  }

  const message = extractErrorMessage(payload, fallback);
  return isSafeUserMessage(message) ? message : "Request failed. Please try again.";
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

export async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

function createTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let didTimeout = false;

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
  };
}

function createFetchError(caught: unknown, didTimeout: boolean): ApiError {
  if (didTimeout || isAbortError(caught)) {
    return {
      message: REQUEST_TIMEOUT_MESSAGE,
      status: 504,
      details: null,
    };
  }

  return {
    message: BACKEND_UNAVAILABLE_MESSAGE,
    status: 503,
    details: null,
  };
}

function isAbortError(caught: unknown) {
  return (
    caught instanceof DOMException &&
    (caught.name === "AbortError" || caught.name === "TimeoutError")
  );
}

function isSafeUserMessage(message: string) {
  return (
    message.length <= 240 &&
    !/traceback|stack trace|exception|^\s*error:/i.test(message) &&
    !/\n\s*at\s+\S+/i.test(message)
  );
}
