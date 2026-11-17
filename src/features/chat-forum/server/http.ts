import { NextResponse } from "next/server";

// Preserve the forum's existing CORS contract. Production origins are enforced
// by shared middleware, which is outside this feature cleanup.
export function forumCorsHeaders(methods: string) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/** Validates the JSON object envelope; routes still validate their fields. */
export async function readForumJson<T extends object>(
  request: Request,
  headers: HeadersInit,
): Promise<
  { data: T; response?: never } | { data?: never; response: NextResponse }
> {
  try {
    const data: unknown = await request.json();
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return { data: data as T };
    }
  } catch {
    // Invalid JSON and non-object bodies share a controlled client error.
  }
  return {
    response: NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    ),
  };
}
