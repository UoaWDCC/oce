import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { mockSupabase, resetAll, createMockRequest, readJson } from "./helpers";
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

const mockParams = {
  params: Promise.resolve({ commentId: "comment-1", reactionType: "heart" }),
};

describe("POST /api/comments/[commentId]/reaction/[reactionType]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("creates a heart reaction successfully", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          comment_id: "comment-1",
          user_id: "test-user",
          reaction: "heart",
        },
        error: null,
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{
      reaction: { comment_id: string; user_id: string };
    }>(res);

    expect(res.status).toBe(201);
    expect(json.reaction.comment_id).toBe("comment-1");
    expect(json.reaction.user_id).toBe("test-user");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 404 when comment not found", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when comment is soft-deleted", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { deleted_at: "2026-06-01" },
      error: null,
    });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when comment query errors", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 409 when already reacted", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({
        data: { comment_id: "comment-1", user_id: "test-user" },
        error: null,
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(409);
    expect(json.error).toBe(
      "You have already added a heart reaction to this comment",
    );
  });

  it("returns 500 when checking existing reaction fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Reaction check failed" },
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Reaction check failed");
  });

  it("returns 500 when insert fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Reaction insert failed" },
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Reaction insert failed");
  });
});

describe("DELETE /api/comments/[commentId]/reaction/[reactionType]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("removes a heart reaction successfully", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { deleted_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { comment_id: "comment-1", user_id: "test-user" },
        error: null,
      });
    // eq call count:
    // 1. comment-check .eq("id") -> chain
    // 2. reaction-check .eq("comment_id") -> chain
    // 3. reaction-check .eq("user_id") -> chain
    // 4. reaction-check .eq("reaction") -> chain to .maybeSingle()
    // 5. delete .eq("comment_id") -> chain
    // 6. delete .eq("user_id") -> chain
    // 7. delete .eq("reaction") -> terminal
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase) // #1
      .mockReturnValueOnce(mockSupabase) // #2
      .mockReturnValueOnce(mockSupabase) // #3
      .mockReturnValueOnce(mockSupabase) // #4
      .mockReturnValueOnce(mockSupabase) // #5
      .mockReturnValueOnce(mockSupabase) // #6
      .mockReturnValueOnce(Promise.resolve({ error: null })); // #7

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ message: string }>(res);

    expect(res.status).toBe(200);
    expect(json.message).toBe("heart reaction removed");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 404 when comment not found", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when comment is deleted", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { deleted_at: "2026-06-01" },
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when reaction does not exist", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { deleted_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe(
      "You have not added a heart reaction to this comment",
    );
  });

  it("returns 404 when comment query errors", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 500 when checking existing reaction fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { deleted_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Reaction check failed" },
      });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Reaction check failed");
  });

  it("returns 500 when delete fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { deleted_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          comment_id: "comment-1",
          user_id: "test-user",
          reaction: "heart",
        },
        error: null,
      });
    // eq call count: same as success test
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase) // #1 comment-check
      .mockReturnValueOnce(mockSupabase) // #2 reaction-check
      .mockReturnValueOnce(mockSupabase) // #3 reaction-check
      .mockReturnValueOnce(mockSupabase) // #4 delete
      .mockReturnValueOnce(mockSupabase) // #5 delete
      .mockReturnValueOnce(mockSupabase) // #6 delete
      .mockReturnValueOnce(
        Promise.resolve({ error: { message: "Reaction delete failed" } }),
      ); // #7 delete terminal

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Reaction delete failed");
  });
});
