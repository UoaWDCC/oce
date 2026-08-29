import { getAccessToken } from "./getAccessToken";

// Carries the HTTP status so callers can branch on it (e.g. 429 for the token
// limit) instead of matching on server error copy, which is not a contract.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  authorize: boolean = false,
) {
  const headers = new Headers(init.headers);
  if (authorize) {
    const accessToken = await getAccessToken();
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      data?.error ?? "AI Tutor request failed.",
      response.status,
    );
  }

  return response;
}
