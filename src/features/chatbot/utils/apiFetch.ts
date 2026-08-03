import { getAccessToken } from "./getAccessToken";

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
    throw new Error(data?.error ?? "AI Tutor request failed.");
  }

  return response;
}
