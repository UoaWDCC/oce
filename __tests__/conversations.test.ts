import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/ai-tutor/conversations/route";
import { authenticateUser } from "@/utils/authHelper";
import type { Conversation } from "@/features/chatbot/types";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

const conversationsUrl = "http://localhost/api/ai-tutor/conversations";

type QueryResult = {
  data: Conversation[] | null;
  error: { message: string } | null;
};

let queryResult: QueryResult;

const queryBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(),
};

function conversation(id: string, updatedAt: string): Conversation {
  return {
    id,
    user_id: "test-user",
    title: id,
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: updatedAt,
  };
}

function request(query = "") {
  return new NextRequest(`${conversationsUrl}${query}`, {
    headers: { Authorization: "Bearer fake-token" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: [], error: null };

  mockSupabase.from.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.neq.mockReturnValue(queryBuilder);
  queryBuilder.ilike.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.range.mockImplementation(async () => queryResult);

  vi.mocked(authenticateUser).mockResolvedValue({
    supabase: mockSupabase as never,
    user: { id: "test-user" } as never,
    accessToken: "fake-token",
  });
});

describe("GET /api/ai-tutor/conversations pagination", () => {
  it("uses the default limit and zero-based offset", async () => {
    const response = await GET(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 20);
    expect(json).toEqual({ conversation: [], hasMore: false, nextOffset: 0 });
  });

  it("uses an explicit limit and offset and removes the probe row", async () => {
    const newest = conversation("conv-5", "2026-08-05T00:00:00Z");
    const middle = conversation("conv-4", "2026-08-04T00:00:00Z");
    const probe = conversation("conv-3", "2026-08-03T00:00:00Z");
    queryResult = { data: [newest, middle, probe], error: null };

    const response = await GET(request("?limit=2&offset=3"));
    const json = await response.json();

    expect(queryBuilder.range).toHaveBeenCalledWith(3, 5);
    expect(json).toEqual({
      conversation: [newest, middle],
      hasMore: true,
      nextOffset: 5,
    });
  });

  it("caps limits above 100", async () => {
    const response = await GET(request("?limit=101&offset=4"));

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
    ["hexadecimal limit", "?limit=0x10"],
    ["hexadecimal offset", "?offset=0x10"],
    ["exponential limit", "?limit=1e2"],
    ["exponential offset", "?offset=1e2"],
    ["unsafe limit", "?limit=9007199254740992"],
    ["unsafe offset", "?offset=9007199254740992"],
  ])("returns 400 for an %s", async (_name, query) => {
    const response = await GET(request(query));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({
      error:
        "limit must be a positive base-10 integer and offset must be a non-negative base-10 integer",
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns a partial final page with terminal metadata", async () => {
    const first = conversation("conv-2", "2026-08-02T00:00:00Z");
    const second = conversation("conv-1", "2026-08-01T00:00:00Z");
    queryResult = { data: [first, second], error: null };

    const response = await GET(request("?limit=3&offset=6"));
    const json = await response.json();

    expect(json).toEqual({
      conversation: [first, second],
      hasMore: false,
      nextOffset: 8,
    });
  });

  it("keeps an exact final page newest-to-oldest", async () => {
    const page = [
      conversation("conv-3", "2026-08-03T00:00:00Z"),
      conversation("conv-2", "2026-08-02T00:00:00Z"),
      conversation("conv-1", "2026-08-01T00:00:00Z"),
    ];
    queryResult = { data: page, error: null };

    const response = await GET(request("?limit=3&offset=3"));
    const json = await response.json();

    expect(json).toEqual({
      conversation: page,
      hasMore: false,
      nextOffset: 6,
    });
  });

  it.each([
    ["empty first page", "?limit=3", 0],
    ["past-the-end page", "?limit=3&offset=12", 12],
  ])(
    "returns terminal metadata for an %s",
    async (_name, query, nextOffset) => {
      const response = await GET(request(query));
      const json = await response.json();

      expect(json).toEqual({ conversation: [], hasMore: false, nextOffset });
    },
  );

  it("orders deterministically before applying the range", async () => {
    await GET(request());

    expect(queryBuilder.order).toHaveBeenNthCalledWith(1, "updated_at", {
      ascending: false,
    });
    expect(queryBuilder.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(queryBuilder.order.mock.invocationCallOrder[1]).toBeLessThan(
      queryBuilder.range.mock.invocationCallOrder[0],
    );
  });
});

describe("GET /api/ai-tutor/conversations filtering", () => {
  it("filters to the authenticated user's non-ended conversations", async () => {
    await GET(request());

    expect(mockSupabase.from).toHaveBeenCalledWith("conversations");
    expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "test-user");
    expect(queryBuilder.neq).toHaveBeenCalledWith("status", "ended");
  });

  it("filters search results before ordering and pagination", async () => {
    await GET(request("?q=DAO&limit=5"));

    expect(queryBuilder.ilike).toHaveBeenCalledWith("title", "%DAO%");
    expect(queryBuilder.ilike.mock.invocationCallOrder[0]).toBeLessThan(
      queryBuilder.order.mock.invocationCallOrder[0],
    );
    expect(queryBuilder.ilike.mock.invocationCallOrder[0]).toBeLessThan(
      queryBuilder.range.mock.invocationCallOrder[0],
    );
  });

  it("treats a whitespace-only search as absent", async () => {
    await GET(request("?q=%20%20"));

    expect(queryBuilder.ilike).not.toHaveBeenCalled();
  });

  it("escapes ILIKE wildcard characters in search text", async () => {
    await GET(request(`?q=${encodeURIComponent("100%_off*")}`));

    expect(queryBuilder.ilike).toHaveBeenCalledWith(
      "title",
      "%100\\%\\_off\\*%",
    );
  });
});

describe("GET /api/ai-tutor/conversations errors", () => {
  it("preserves authentication failures", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns a generic 500 response for database errors", async () => {
    queryResult = { data: null, error: { message: "DB error" } };

    const response = await GET(request("?q=DAO"));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch conversations" });
  });
});
