const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * What the person can do about a failure, which is what the screens tell apart:
 * offline (check the connection), unavailable (the server is down; wait and retry),
 * signedOut (sign in again), rejected (the request itself was refused) and
 * broken (a fault on our side; the reference matches the server's log line).
 */
export type ErrorKind = "offline" | "unavailable" | "signedOut" | "rejected" | "broken";

interface ApiErrorDetails {
  code?: string;
  requestId?: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  /** Status 0 means the server was never reached. */
  constructor(message: string, status: number, details: ApiErrorDetails = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = details.code ?? defaultCode(status);
    this.requestId = details.requestId ?? null;
  }

  get kind(): ErrorKind {
    if (this.status === 0) return "offline";
    if (this.status === 401) return "signedOut";
    // The gateway's answers (Caddy, Cloudflare) when the API itself is not up.
    if ([502, 503, 504].includes(this.status) || (this.status >= 520 && this.status <= 530)) return "unavailable";
    if (this.status >= 500) return "broken";
    return "rejected";
  }
}

function defaultCode(status: number): string {
  if (status === 0) return "offline";
  return status >= 500 ? "internal_error" : "error";
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Hear about any call answered 401: the session ended (signed out elsewhere, or
 * expired) and the planner should go back to its login page. Returns the way to stop.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

interface ErrorPayload {
  detail?: unknown;
  code?: string;
  request_id?: string;
}

async function failureOf(response: Response): Promise<ApiError> {
  let payload: ErrorPayload = {};
  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    // A non-JSON error body (a proxy's page) tells us nothing the status line does not.
  }
  // A validation answer's detail is a list of fields, not a sentence.
  const message =
    typeof payload.detail === "string" && payload.detail
      ? payload.detail
      : `${response.status} ${response.statusText}`.trim();
  return new ApiError(message, response.status, {
    code: payload.code,
    requestId: payload.request_id ?? response.headers.get("X-Request-ID"),
  });
}

/** An absolute API address, for links the browser follows itself (a download). */
export function apiUrl(path: string): string {
  return `${baseUrl}${path}`;
}

function encodeBody(body: unknown): RequestInit {
  if (body === undefined) {
    return { headers: { "Content-Type": "application/json" } };
  }
  // A file upload: the browser writes the multipart Content-Type, boundary included.
  if (body instanceof FormData) {
    return { body };
  }
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** Every call to the API goes through here, so failures surface the same way. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      // The session cookie. Same-origin on the Pi; in development the planner and
      // the API sit on two localhost ports, which the browser treats as cross-origin.
      credentials: "include",
      ...encodeBody(options.body),
    });
  } catch {
    // fetch rejects only when no answer came back at all: offline, or no server there.
    throw new ApiError("offline", 0);
  }

  if (response.status === 401) {
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (!response.ok) {
    throw await failureOf(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
