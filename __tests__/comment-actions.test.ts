import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { mockSupabase, resetAll, createMockRequest } from "./helpers";
import { PATCH, DELETE } from "@/app/api/comments/[commentId]/route";
import { authenticateUser } from "@/utils/authHelper";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

const mockParams = {
  params: Promise.resolve({ commentId: "comment-1" }),
};

// A comment that exists, is not deleted, and belongs to test-user
const existingComment = {
  id: "comment-1",
  author_id: "test-user",
  post_id: "post-1",
  body: "Original body",
  image_url: "original.png",
  deleted_at: null,
};

// The parent post exists and is not deleted
const existingPost = {
  id: "post-1",
  deleted_at: null,
};

describe("PATCH /api/comments/[commentId]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("updates a comment successfully", async () => {
    // Query 1: fetch comment
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      // Query 2: fetch parent post
      .mockResolvedValueOnce({ data: existingPost, error: null });
    // Query 3: update comment
    mockSupabase.single.mockResolvedValueOnce({
      data: { ...existingComment, body: "Updated body" },
      error: null,
    });

    const req = createMockRequest("PATCH", { body: "Updated body" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.comment.body).toBe("Updated body");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 400 when body is not a string or null", async () => {
    const req = createMockRequest("PATCH", { body: 123 });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Comment body must be a string or null");
  });

  it("returns 400 when image_url is not a string or null", async () => {
    const req = createMockRequest("PATCH", { image_url: 123 });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Image URL must be a string or null");
  });

  it("returns 400 when body is empty after trim", async () => {
    const req = createMockRequest("PATCH", { body: "   " });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Comment body cannot be empty");
  });

  it("returns 400 when image_url is empty after trim", async () => {
    const req = createMockRequest("PATCH", { image_url: "   " });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Image URL cannot be empty");
  });

  it("returns 400 when no update fields provided", async () => {
    const req = createMockRequest("PATCH", {});
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No update fields provided");
  });

  it("returns 404 when comment not found", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when comment is deleted", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { ...existingComment, deleted_at: "2026-06-01" },
      error: null,
    });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { ...existingComment, author_id: "different-user" },
      error: null,
    });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 400 when update would make comment empty", async () => {
    // Comment has no image, and we're setting body to null
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { ...existingComment, image_url: null },
      error: null,
    });

    const req = createMockRequest("PATCH", { body: null });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Comment cannot be empty");
  });

  it("returns 404 when parent post not found", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when update fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      .mockResolvedValueOnce({ data: existingPost, error: null });
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Update failed" },
    });

    const req = createMockRequest("PATCH", { body: "Updated" });
    const res = await PATCH(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Update failed");
  });
});

describe("DELETE /api/comments/[commentId]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("soft-deletes a comment successfully", async () => {
    // Query 1: fetch comment
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      // Query 2: fetch parent post
      .mockResolvedValueOnce({ data: existingPost, error: null });
    // Query 3: soft-delete comment
    mockSupabase.single.mockResolvedValueOnce({
      data: { ...existingComment, deleted_at: "2026-06-10" },
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.comment.deleted_at).toBeTruthy();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 404 when comment not found", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 404 when comment is deleted", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { ...existingComment, deleted_at: "2026-06-01" },
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Comment not found");
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { ...existingComment, author_id: "different-user" },
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 404 when parent post not found", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when soft-delete fails", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: existingComment, error: null })
      .mockResolvedValueOnce({ data: existingPost, error: null });
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Delete failed" },
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Delete failed");
  });
});
