import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { createMockRequest, mockSupabase, readJson, resetAll } from "./helpers";
import {
  POST,
  DELETE,
} from "@/app/api/comments/[commentId]/reaction/[reactionType]/route";
import { authenticateUser } from "@/utils/authHelper";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const reactionTypes = ["thumbs_up", "fire", "thumbs_down"] as const;

function params(reactionType: string) {
  return {
    params: Promise.resolve({ commentId: "comment-1", reactionType }),
  };
}

describe("/api/comments/[commentId]/reaction/[reactionType]", () => {
  beforeEach(() => {
    resetAll();
  });

  it.each(reactionTypes)("adds a %s reaction", async (reactionType) => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          comment_id: "comment-1",
          user_id: "test-user",
          reaction: reactionType,
        },
        error: null,
      });

    const res = await POST(createMockRequest("POST"), params(reactionType));
    const json = await readJson<{
      reaction: { comment_id: string; reaction: string };
    }>(res);

    expect(res.status).toBe(201);
    expect(json.reaction.comment_id).toBe("comment-1");
    expect(json.reaction.reaction).toBe(reactionType);
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      comment_id: "comment-1",
      user_id: "test-user",
      reaction: reactionType,
    });
  });

  it("rejects an unsupported reaction type", async () => {
    const res = await POST(createMockRequest("POST"), params("laugh"));
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid reaction type");
  });

  it("removes a reaction", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({
        data: {
          comment_id: "comment-1",
          user_id: "test-user",
          reaction: "fire",
        },
        error: null,
      });
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(Promise.resolve({ error: null }));

    const res = await DELETE(createMockRequest("DELETE"), params("fire"));
    const json = await readJson<{ message: string }>(res);

    expect(res.status).toBe(200);
    expect(json.message).toBe("fire reaction removed");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(createMockRequest("POST"), params("thumbs_down"));

    expect(res.status).toBe(401);
  });
});
