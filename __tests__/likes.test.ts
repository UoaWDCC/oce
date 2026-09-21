import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { mockSupabase, resetAll, createMockRequest, readJson } from "./helpers";
import { POST, DELETE } from "@/app/api/comments/[commentId]/like/route";
import { authenticateUser } from "@/utils/authHelper";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const mockParams = { params: Promise.resolve({ commentId: "comment-1" }) };

describe("POST /api/comments/[commentId]/like", () => {
  beforeEach(() => {
    resetAll();
  });

  it("creates a like successfully", async () => {
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
      like: { comment_id: string; user_id: string };
    }>(res);

    expect(res.status).toBe(201);
    expect(json.like.comment_id).toBe("comment-1");
    expect(json.like.user_id).toBe("test-user");
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

  it("returns 409 when already liked", async () => {
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
    expect(json.error).toBe("You have already liked this comment");
  });

  it("returns 500 when checking existing like fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Like check failed" },
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Like check failed");
  });

  it("returns 500 when insert fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Like insert failed" },
      });

    const req = createMockRequest("POST");
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Like insert failed");
  });
});

describe("DELETE /api/comments/[commentId]/like", () => {
  beforeEach(() => {
    resetAll();
  });

  it("removes a like successfully", async () => {
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
    // 2. like-check .eq("comment_id") -> chain
    // 3. like-check .eq("user_id") -> chain
    // 4. like-check .eq("reaction") -> chain to .maybeSingle()
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
    expect(json.message).toBe("Like removed");
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

  it("returns 404 when like does not exist", async () => {
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
    expect(json.error).toBe("You have not liked this comment");
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

  it("returns 500 when checking existing like fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { deleted_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Like check failed" },
      });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Like check failed");
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
      .mockReturnValueOnce(mockSupabase) // #2 like-check
      .mockReturnValueOnce(mockSupabase) // #3 like-check
      .mockReturnValueOnce(mockSupabase) // #4 delete
      .mockReturnValueOnce(mockSupabase) // #5 delete
      .mockReturnValueOnce(mockSupabase) // #6 delete
      .mockReturnValueOnce(
        Promise.resolve({ error: { message: "Like delete failed" } }),
      ); // #7 delete terminal

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Like delete failed");
  });
});
