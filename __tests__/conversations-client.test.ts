import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversations } from "@/features/chatbot/api/conversations";
import { apiFetch } from "@/features/chatbot/utils/apiFetch";
import type {
  Conversation,
  GetConversationsResponse,
} from "@/features/chatbot/types";

vi.mock("@/features/chatbot/utils/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

const conversation: Conversation = {
  id: "conv-1",
  user_id: "test-user",
  title: "DAOs",
  status: "active",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
};

const responseBody: GetConversationsResponse = {
  conversation: [conversation],
  hasMore: true,
  nextOffset: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
});

describe("getConversations", () => {
  it("constructs the default first-page request and extracts the response", async () => {
    const result = await getConversations();

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/ai-tutor/conversations?offset=0&limit=20",
      {},
      true,
    );
    expect(result).toEqual(responseBody);
  });

  it("forwards an explicit offset and limit", async () => {
    await getConversations({ offset: 40, limit: 10 });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/ai-tutor/conversations?offset=40&limit=10",
      {},
      true,
    );
  });

  it("forwards trimmed search text with q and first-page pagination", async () => {
    await getConversations({ query: "  DAO governance  " });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/ai-tutor/conversations?q=DAO+governance&offset=0&limit=20",
      {},
      true,
    );
  });

  it("does not emit an undefined or blank q parameter", async () => {
    await getConversations({ query: "   " });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/ai-tutor/conversations?offset=0&limit=20",
      {},
      true,
    );
  });

  it.each([
    [{ conversation: [], hasMore: "yes", nextOffset: 0 }],
    [{ conversation: [], hasMore: false, nextOffset: 1.5 }],
    [{ conversation: [], hasMore: false, nextOffset: -1 }],
    [{ conversation: {}, hasMore: false, nextOffset: 0 }],
  ])("rejects an invalid response shape", async (body) => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getConversations()).rejects.toThrow(
      "Invalid conversations response",
    );
  });
});
