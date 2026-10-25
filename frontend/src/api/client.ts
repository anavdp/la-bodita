const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

async function describeFailure(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // A non-JSON error body tells us nothing the status line does not.
  }
  return `${response.status} ${response.statusText}`.trim();
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
  const response = await fetch(apiUrl(path), {
    method: options.method ?? "GET",
    // The session cookie. Same-origin on the Pi; in development the planner and
    // the API sit on two localhost ports, which the browser treats as cross-origin.
    credentials: "include",
    ...encodeBody(options.body),
  });

  if (response.status === 401) {
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (!response.ok) {
    throw new ApiError(await describeFailure(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
