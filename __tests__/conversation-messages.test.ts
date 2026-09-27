import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/ai-tutor/conversations/[id]/messages/route";
import { authenticateUser } from "@/utils/authHelper";
import type { TutorMessage } from "@/features/chatbot/types";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

const conversationId = "123e4567-e89b-42d3-a456-426614174000";
const messagesUrl = `http://localhost/api/ai-tutor/conversations/${conversationId}/messages`;

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

let conversationResult: QueryResult;
let messageResult: QueryResult;

const queryBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(),
};

function message(id: string, createdAt: string): TutorMessage {
  return {
    id,
    conversation_id: conversationId,
    role: "user",
    content: id,
    is_favourite: false,
    created_at: createdAt,
  };
}

function request(query = "") {
  return new NextRequest(`${messagesUrl}${query}`, {
    headers: { Authorization: "Bearer fake-token" },
  });
}

async function get(query = "") {
  return GET(request(query), {
    params: Promise.resolve({ id: conversationId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  conversationResult = { data: { id: conversationId }, error: null };
  messageResult = { data: [], error: null };

  mockSupabase.from.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.maybeSingle.mockImplementation(async () => conversationResult);
  queryBuilder.range.mockImplementation(async () => messageResult);

  vi.mocked(authenticateUser).mockResolvedValue({
    supabase: mockSupabase as never,
    user: { id: "test-user" } as never,
    accessToken: "fake-token",
  });
});

describe("GET /api/ai-tutor/conversations/:id/messages pagination", () => {
  it("uses the default limit and offset", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 15);
  });

  it("uses explicit limit and offset and removes the probe row", async () => {
    messageResult = {
      data: [
        message("message-5", "2026-08-05T00:00:00Z"),
        message("message-4", "2026-08-04T00:00:00Z"),
        message("message-3", "2026-08-03T00:00:00Z"),
      ],
      error: null,
    };

    const response = await get("?limit=2&offset=3");
    const json = await response.json();

    expect(queryBuilder.range).toHaveBeenCalledWith(3, 5);
    expect(json).toEqual({
      messages: [
        message("message-4", "2026-08-04T00:00:00Z"),
        message("message-5", "2026-08-05T00:00:00Z"),
      ],
      hasMore: true,
      nextOffset: 5,
    });
  });

  it("caps limits above 100", async () => {
    const response = await get("?limit=101&offset=4");

    expect(response.status).toBe(200);
    expect(queryBuilder.range).toHaveBeenCalledWith(4, 104);
  });

  it.each([
    ["empty limit", "?limit="],
    ["empty offset", "?offset="],
    ["malformed limit", "?limit=abc"],
    ["malformed offset", "?offset=abc"],
    ["decimal limit", "?limit=1.5"],
    ["decimal offset", "?offset=1.5"],
    ["zero limit", "?limit=0"],
    ["negative limit", "?limit=-1"],
    ["negative offset", "?offset=-1"],
    ["exponential limit", "?limit=1e2"],
    ["exponential offset", "?offset=1e2"],
    ["hexadecimal limit", "?limit=0x10"],
    ["hexadecimal offset", "?offset=0x10"],
    ["unsafe limit", "?limit=9007199254740992"],
    ["unsafe offset", "?offset=9007199254740992"],
  ])("returns 400 for an %s", async (_name, query) => {
    const response = await get(query);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({
      error:
        "limit must be a positive base-10 integer and offset must be a non-negative base-10 integer",
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns hasMore false for a partial final page", async () => {
    messageResult = {
      data: [
        message("message-2", "2026-08-02T00:00:00Z"),
        message("message-1", "2026-08-01T00:00:00Z"),
      ],
      error: null,
    };

    const response = await get("?limit=3&offset=6");
    const json = await response.json();

    expect(json).toEqual({
      messages: [
        message("message-1", "2026-08-01T00:00:00Z"),
        message("message-2", "2026-08-02T00:00:00Z"),
      ],
      hasMore: false,
      nextOffset: 8,
    });
  });

  it("returns hasMore false when the final page exactly matches the limit", async () => {
    messageResult = {
      data: [
        message("message-3", "2026-08-03T00:00:00Z"),
        message("message-2", "2026-08-02T00:00:00Z"),
        message("message-1", "2026-08-01T00:00:00Z"),
      ],
      error: null,
    };

    const response = await get("?limit=3&offset=3");
    const json = (await response.json()) as {
      hasMore: boolean;
      nextOffset: number;
    };

    expect(json.hasMore).toBe(false);
    expect(json.nextOffset).toBe(6);
  });

  it.each([
    ["empty first page", "?limit=3", 0],
    ["past-the-end page", "?limit=3&offset=12", 12],
  ])(
    "returns terminal metadata for an %s",
    async (_name, query, nextOffset) => {
      const response = await get(query);
      const json = await response.json();

      expect(json).toEqual({ messages: [], hasMore: false, nextOffset });
    },
  );

  it("uses deterministic newest-first database ordering", async () => {
    await get();

    expect(queryBuilder.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(queryBuilder.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
  });
});

describe("GET /api/ai-tutor/conversations/:id/messages access control", () => {
  it("preserves authentication failures", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await get();

    expect(response.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("requires the conversation to belong to the authenticated user", async () => {
    conversationResult = { data: null, error: null };

    const response = await get();
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ error: "Conversation not found" });
    expect(queryBuilder.eq).toHaveBeenNthCalledWith(1, "id", conversationId);
    expect(queryBuilder.eq).toHaveBeenNthCalledWith(2, "user_id", "test-user");
    expect(queryBuilder.range).not.toHaveBeenCalled();
  });

  it("filters the message query to the owned conversation", async () => {
    await get();

    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, "conversations");
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, "messages");
    expect(queryBuilder.eq).toHaveBeenNthCalledWith(
      3,
      "conversation_id",
      conversationId,
    );
  });
});
