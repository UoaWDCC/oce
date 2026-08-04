import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import {
  mockSupabase,
  setMockQueryResult,
  resetAll,
  createMockRequest,
  readJson,
} from "./helpers";
import { GET } from "@/app/api/ai-tutor/conversations/route";
import { authenticateUser } from "@/utils/authHelper";
import type { Conversation } from "@/features/chatbot/types";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const conversationsUrl = "http://localhost/api/ai-tutor/conversations";

const fakeConversations: Conversation[] = [
  {
    id: "conv-1",
    user_id: "test-user",
    title: "Learning about DAOs",
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
  },
];

describe("GET /api/ai-tutor/conversations", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns the normal list when q is absent", async () => {
    setMockQueryResult({ data: fakeConversations, error: null });

    const req = createMockRequest("GET", undefined, conversationsUrl);
    const res = await GET(req);
    const json = await readJson<{ conversation: Conversation[] }>(res);

    expect(res.status).toBe(200);
    expect(json.conversation).toEqual(fakeConversations);
    expect(mockSupabase.ilike).not.toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "test-user");
    expect(mockSupabase.neq).toHaveBeenCalledWith("status", "ended");
  });

  it("returns the normal list when q is whitespace-only", async () => {
    setMockQueryResult({ data: fakeConversations, error: null });

    const req = createMockRequest(
      "GET",
      undefined,
      `${conversationsUrl}?q=%20%20`,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockSupabase.ilike).not.toHaveBeenCalled();
  });

  it("filters by title when q is present", async () => {
    setMockQueryResult({ data: fakeConversations, error: null });

    const req = createMockRequest(
      "GET",
      undefined,
      `${conversationsUrl}?q=DAO`,
    );
    const res = await GET(req);
    const json = await readJson<{ conversation: Conversation[] }>(res);

    expect(res.status).toBe(200);
    expect(json.conversation).toEqual(fakeConversations);
    expect(mockSupabase.ilike).toHaveBeenCalledWith("title", "%DAO%");
  });

  it("escapes ILIKE wildcard characters in q", async () => {
    setMockQueryResult({ data: [], error: null });

    const req = createMockRequest(
      "GET",
      undefined,
      `${conversationsUrl}?q=${encodeURIComponent("100%_off")}`,
    );
    await GET(req);

    expect(mockSupabase.ilike).toHaveBeenCalledWith("title", "%100\\%\\_off%");
  });

  it("escapes a literal asterisk in q", async () => {
    setMockQueryResult({ data: [], error: null });

    const req = createMockRequest("GET", undefined, `${conversationsUrl}?q=*`);
    await GET(req);

    expect(mockSupabase.ilike).toHaveBeenCalledWith("title", "%\\*%");
  });

  it("returns 200 with an empty array when no conversations match", async () => {
    setMockQueryResult({ data: [], error: null });

    const req = createMockRequest(
      "GET",
      undefined,
      `${conversationsUrl}?q=nonexistent`,
    );
    const res = await GET(req);
    const json = await readJson<{ conversation: Conversation[] }>(res);

    expect(res.status).toBe(200);
    expect(json.conversation).toEqual([]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("GET", undefined, conversationsUrl);
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 500 when supabase errors during a search query", async () => {
    setMockQueryResult({ data: null, error: { message: "DB error" } });

    const req = createMockRequest(
      "GET",
      undefined,
      `${conversationsUrl}?q=DAO`,
    );
    const res = await GET(req);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to fetch conversations");
    expect(JSON.stringify(json)).not.toContain("DB error");
  });
});
