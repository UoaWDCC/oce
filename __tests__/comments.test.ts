import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  defaultCommentBody,
  mockSupabase,
  resetAll,
  createMockRequest,
  readJson,
} from "./helpers";
import {
  GET,
  POST,
} from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/comments/route";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";

type CommentListItem = {
  id: string;
  body: string | null;
  image_url: string | null;
  author_id: string;
  username: string;
  like_count: number;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const mockParamsWithPostId = {
  params: Promise.resolve({ daoGroupId: "dao-1", postId: "post-1" }),
};

describe("POST /api/dao-forum/[daoGroupId]/posts/[postId]/comments", () => {
  beforeEach(() => {
    resetAll();
  });

  it("creates a comment successfully", async () => {
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: { id: "comment-1", body: "Content", image_url: "example.png" },
        error: null,
      }),
    );
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{
      success: boolean;
      comment: { id: string };
    }>(res);

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.comment.id).toBe("comment-1");
  });

  it("returns 400 when comment is empty", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );

    const req = createMockRequest("POST", {
      parent_comment_id: null,
      body: "",
      image_url: "",
    });
    const res = await POST(req, mockParamsWithPostId);

    expect(res.status).toBe(400);
  });

  it("returns 400 when parent comment not found", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const req = createMockRequest("POST", {
      parent_comment_id: "non-existent-comment",
      body: "Content",
      image_url: "example.png",
    });
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(400);
  });

  it("returns 400 when parent comment is soft-deleted", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { deleted_at: null }, error: null })
      .mockResolvedValueOnce({
        data: { deleted_at: "2026-06-01" },
        error: null,
      });

    const req = createMockRequest("POST", {
      parent_comment_id: "deleted-comment",
      body: "Content",
      image_url: "example.png",
    });
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("Parent comment not found");
  });

  it("returns 400 when request body is invalid JSON", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: { deleted_at: null }, error: null }),
    );
    const req = new NextRequest(
      "http://localhost/api/dao-forum/dao-1/posts/post-1/comments",
      {
        method: "POST",
        body: "not json",
        headers: { Authorization: "Bearer fake-token" },
      },
    );
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a DAO member", async () => {
    vi.mocked(checkDAOMembership).mockResolvedValue(false);

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);

    expect(res.status).toBe(403);
  });

  it("returns 404 when post is not found", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 404 when post is soft-deleted", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: { deleted_at: "2026-06-01" }, error: null }),
    );

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when insert fails", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: "Comment insert failed" },
      }),
    );

    const req = createMockRequest("POST", defaultCommentBody);
    const res = await POST(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Comment insert failed");
  });
});

describe("GET /api/dao-forum/[daoGroupId]/posts/[postId]/comments", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns 200 with empty array when no comments", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(Promise.resolve({ data: null, error: null }));

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it("returns 200 with sorted comments", async () => {
    const fakeComments = [
      {
        id: "c1",
        body: "Older comment",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: null,
        like_count: 5,
        author: {
          id: "user-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
        },
      },
      {
        id: "c2",
        body: "Newer comment",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z",
        deleted_at: null,
        like_count: 10,
        author: {
          id: "user-2",
          username: "bob",
          FirstName: "Bob",
          LastName: "B",
        },
      },
    ];

    // Step 1: post exists
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", deleted_at: null },
        error: null,
      }),
    );
    // Step 2: comments query returns fake data
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(
        Promise.resolve({ data: fakeComments, error: null }),
      );

    // Default sort is "oldest" — c1 should come first
    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe("c1");
    expect(json[1].id).toBe("c2");
  });

  it("returns 200 with comments sorted by latest", async () => {
    const fakeComments = [
      {
        id: "c1",
        body: "Older comment",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: null,
        like_count: 5,
        author: {
          id: "user-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
        },
      },
      {
        id: "c2",
        body: "Newer comment",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z",
        deleted_at: null,
        like_count: 10,
        author: {
          id: "user-2",
          username: "bob",
          FirstName: "Bob",
          LastName: "B",
        },
      },
    ];

    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", deleted_at: null },
        error: null,
      }),
    );
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(
        Promise.resolve({ data: fakeComments, error: null }),
      );

    const req = new NextRequest(
      "http://localhost/api/dao-forum/dao-1/posts/post-1/comments?sort=latest",
      { method: "GET", headers: { Authorization: "Bearer fake-token" } },
    );
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe("c2");
    expect(json[1].id).toBe("c1");
  });

  it("returns 200 with comments sorted by most likes", async () => {
    const fakeComments = [
      {
        id: "c1",
        body: "Less liked",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: null,
        like_count: 5,
        author: {
          id: "user-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
        },
      },
      {
        id: "c2",
        body: "More liked",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z",
        deleted_at: null,
        like_count: 10,
        author: {
          id: "user-2",
          username: "bob",
          FirstName: "Bob",
          LastName: "B",
        },
      },
    ];

    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", deleted_at: null },
        error: null,
      }),
    );
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(
        Promise.resolve({ data: fakeComments, error: null }),
      );

    const req = new NextRequest(
      "http://localhost/api/dao-forum/dao-1/posts/post-1/comments?sort=most_likes",
      { method: "GET", headers: { Authorization: "Bearer fake-token" } },
    );
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe("c2");
    expect(json[1].id).toBe("c1");
  });

  it("returns 400 when sort option is invalid", async () => {
    const req = new NextRequest(
      "http://localhost/api/dao-forum/dao-1/posts/post-1/comments?sort=invalid",
      { method: "GET", headers: { Authorization: "Bearer fake-token" } },
    );
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid sort option");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a DAO member", async () => {
    vi.mocked(checkDAOMembership).mockResolvedValue(false);

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);

    expect(res.status).toBe(403);
  });

  it("returns 404 when post is not found", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 404 when post is soft-deleted", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: { deleted_at: "2026-06-01" }, error: null }),
    );

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when comment query fails", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(
        Promise.resolve({
          data: null,
          error: { message: "Comment query failed" },
        }),
      );

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Comment query failed");
  });

  it("returns 200 with deleted comments filtered out when no active children", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );
    const fakeComment = [
      {
        id: "c1",
        body: "no active children",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: "2026-06-01",
        like_count: 5,
        author: {
          id: "user-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
        },
      },
    ];
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce({ data: fakeComment, error: null });

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it("returns 200 with deleted parent kept but nullified when it has active children", async () => {
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { deleted_at: null },
        error: null,
      }),
    );
    const fakeComments = [
      {
        id: "c1",
        body: "deleted parent with active children",
        image_url: null,
        parent_comment_id: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: "2026-06-01",
        like_count: 5,
        author: {
          id: "user-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
        },
      },
      {
        id: "c2",
        body: "active child",
        image_url: null,
        parent_comment_id: "c1",
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        deleted_at: null,
        like_count: 5,
        author: {
          id: "user-1",
          username: "bob",
          FirstName: "Bob",
          LastName: "B",
        },
      },
    ];
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce({
        data: fakeComments,
        error: null,
      });

    const req = createMockRequest("GET");
    const res = await GET(req, mockParamsWithPostId);
    const json = await readJson<CommentListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].body).toBeNull();
    expect(json[0].image_url).toBeNull();
    expect(json[1].body).toBe("active child");
  });
});
