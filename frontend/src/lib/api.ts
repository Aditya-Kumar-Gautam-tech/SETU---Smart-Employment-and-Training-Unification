const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof envBaseUrl === "string" && envBaseUrl.trim()) {
    return trimTrailingSlash(envBaseUrl.trim());
  }

  return DEFAULT_API_BASE_URL;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseData = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseData === "object" &&
      responseData !== null &&
      "error" in responseData &&
      typeof responseData.error === "string"
        ? responseData.error
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, responseData);
  }

  return responseData as T;
}
