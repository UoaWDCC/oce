import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import {
  defaultPostBody,
  mockSupabase,
  setMockQueryResult,
  resetAll,
  createMockRequest,
  readJson,
} from "./helpers";
import {
  GET as listGET,
  POST,
} from "@/app/api/dao-forum/[daoGroupId]/posts/route";
import {
  GET as singleGET,
  PATCH,
  DELETE,
} from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/route";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";
import type { PostListItem } from "@app-types/dao-forum";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const mockParamsWithPostId = {
  params: Promise.resolve({ daoGroupId: "dao-1", postId: "post-1" }),
};

const mockParams = { params: Promise.resolve({ daoGroupId: "dao-1" }) };

describe("GET /api/dao-forum/[daoGroupId]/posts", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns posts on success", async () => {
    const fakePosts = [
      {
        id: "post-1",
        dao_group_id: "dao-1",
        author_id: "author-1",
        post_type: "Announcement",
        title: "Hello",
        body: "Post body",
        anonymous: false,
        is_pinned: true,
        image_url: "https://example.com/image.png",
        created_at: "2026-06-01T00:00:00Z",
        updated_at: null,
        author: {
          id: "author-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
          Name: "Alice A",
        },
        post_tags: [
          { tag: { name: "Governance" } },
          { tag: { name: "Technical" } },
        ],
      },
    ];
    setMockQueryResult({ data: fakePosts, error: null });
    mockSupabase.in.mockResolvedValueOnce({
      data: [{ post_id: "post-1" }, { post_id: "post-1" }],
      error: null,
    });

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await readJson<PostListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json).toEqual([
      {
        id: "post-1",
        dao_group_id: "dao-1",
        author_id: "author-1",
        post_type: "Announcement",
        title: "Hello",
        body: "Post body",
        anonymous: false,
        is_pinned: true,
        image_url: "https://example.com/image.png",
        created_at: "2026-06-01T00:00:00Z",
        updated_at: null,
        comment_count: 2,
        view_count: 0,
        author: {
          id: "author-1",
          username: "alice",
          FirstName: "Alice",
          LastName: "A",
          Name: "Alice A",
        },
        tags: ["Governance", "Technical"],
      },
    ]);
    expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("hides author display data for anonymous posts", async () => {
    setMockQueryResult({
      data: [
        {
          id: "post-1",
          dao_group_id: "dao-1",
          author_id: "author-1",
          post_type: "Announcement",
          title: "Anonymous post",
          body: "Post body",
          anonymous: true,
          is_pinned: false,
          image_url: null,
          created_at: "2026-06-01T00:00:00Z",
          updated_at: null,
          author: {
            id: "author-1",
            username: "alice",
            FirstName: "Alice",
            LastName: "A",
            Name: "Alice A",
          },
          post_tags: [],
        },
      ],
      error: null,
    });

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await readJson<PostListItem[]>(res);

    expect(res.status).toBe(200);
    expect(json[0].author).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 500 when supabase errors", async () => {
    setMockQueryResult({ data: null, error: { message: "DB error" } });

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB error");
  });

  it("returns 500 when comment count query fails", async () => {
    setMockQueryResult({
      data: [
        {
          id: "post-1",
          dao_group_id: "dao-1",
          author_id: "author-1",
          post_type: "Announcement",
          title: "Hello",
          body: "Post body",
          anonymous: false,
          is_pinned: false,
          image_url: null,
          created_at: "2026-06-01T00:00:00Z",
          updated_at: null,
          author: null,
          post_tags: [],
        },
      ],
      error: null,
    });
    mockSupabase.in.mockResolvedValueOnce({
      data: null,
      error: { message: "Comment count failed" },
    });

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Comment count failed");
  });
});

describe("POST /api/dao-forum/[daoGroupId]/posts", () => {
  beforeEach(() => {
    resetAll();
  });

  it("creates a post successfully", async () => {
    const newPost = { id: "post-new", title: "New Post" };
    setMockQueryResult({ data: newPost, error: null });

    const req = createMockRequest("POST", {
      title: "New Post",
      body: "Content",
      post_type: "Announcement",
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);
    const json = await readJson<typeof newPost>(res);

    expect(res.status).toBe(201);
    expect(json).toEqual(newPost);
  });

  it("returns 400 when missing required fields", async () => {
    const req = createMockRequest("POST", {
      title: "",
      body: "",
      post_type: "",
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(400);
  });

  it("accepts formatted post body at the visible character limit", async () => {
    const newPost = { id: "post-new", title: "New Post" };
    setMockQueryResult({ data: newPost, error: null });

    const req = createMockRequest("POST", {
      ...defaultPostBody,
      body: `<strong>${"a".repeat(CONTENT_LIMITS.POST_BODY)}</strong>`,
    });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(201);
  });

  it("returns 422 when the title exceeds the character limit", async () => {
    const req = createMockRequest("POST", {
      ...defaultPostBody,
      title: "a".repeat(CONTENT_LIMITS.POST_TITLE + 1),
    });
    const res = await POST(req, mockParams);
    const json = await readJson<{ errors: { title: string } }>(res);

    expect(res.status).toBe(422);
    expect(json.errors.title).toContain(String(CONTENT_LIMITS.POST_TITLE));
  });

  it("returns 422 when the visible post body exceeds the character limit", async () => {
    const req = createMockRequest("POST", {
      ...defaultPostBody,
      body: `<strong>${"a".repeat(CONTENT_LIMITS.POST_BODY + 1)}</strong>`,
    });
    const res = await POST(req, mockParams);
    const json = await readJson<{ errors: { body: string } }>(res);

    expect(res.status).toBe(422);
    expect(json.errors.body).toContain(String(CONTENT_LIMITS.POST_BODY));
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("POST", defaultPostBody);
    const res = await POST(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a DAO member", async () => {
    vi.mocked(checkDAOMembership).mockResolvedValue(false);

    const req = createMockRequest("POST", defaultPostBody);
    const res = await POST(req, mockParams);

    expect(res.status).toBe(403);
  });

  it("returns 409 on duplicate conflict", async () => {
    setMockQueryResult({
      data: null,
      error: { code: "23505", message: "Conflict" },
    });

    const req = createMockRequest("POST", defaultPostBody);
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(409);
    expect(json.error).toBe("Conflict with existing state");
  });

  it("returns 500 when supabase insert fails", async () => {
    setMockQueryResult({ data: null, error: { message: "Insert failed" } });

    const req = createMockRequest("POST", defaultPostBody);
    const res = await POST(req, mockParams);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Insert failed");
  });
});

describe("GET /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns a single post on success", async () => {
    const fakePost = { id: "post-1", title: "Hello", author_id: "test-user" };
    setMockQueryResult({ data: fakePost, error: null });

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await readJson<typeof fakePost>(res);

    expect(res.status).toBe(200);
    expect(json).toEqual(fakePost);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);

    expect(res.status).toBe(401);
  });

  it("returns 404 when post not found", async () => {
    setMockQueryResult({ data: null, error: null });

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when supabase errors", async () => {
    setMockQueryResult({ data: null, error: { message: "DB error" } });

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB error");
  });
});

describe("PATCH /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    resetAll();
  });

  const validBody = {
    title: "Updated",
    body: "Updated body",
    post_type: "Announcement",
    anonymous: false,
    is_pinned: false,
    image_url: null,
  };

  it("updates a post successfully", async () => {
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", author_id: "test-user" },
        error: null,
      }),
    );
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", title: "Updated" },
        error: null,
      }),
    );

    const req = createMockRequest("PATCH", validBody);
    const res = await PATCH(req, mockParamsWithPostId);
    const json = await readJson<{ title: string }>(res);

    expect(res.status).toBe(200);
    expect(json.title).toBe("Updated");
  });

  it("returns 400 when missing required fields", async () => {
    const req = createMockRequest("PATCH", { title: "Only title" });
    const res = await PATCH(req, mockParamsWithPostId);

    expect(res.status).toBe(400);
  });

  it("returns 422 when an updated body exceeds the character limit", async () => {
    const req = createMockRequest("PATCH", {
      ...validBody,
      body: `<em>${"a".repeat(CONTENT_LIMITS.POST_BODY + 1)}</em>`,
    });
    const res = await PATCH(req, mockParamsWithPostId);
    const json = await readJson<{ errors: { body: string } }>(res);

    expect(res.status).toBe(422);
    expect(json.errors.body).toContain(String(CONTENT_LIMITS.POST_BODY));
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("PATCH", validBody);
    const res = await PATCH(req, mockParamsWithPostId);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", author_id: "different-user" },
        error: null,
      }),
    );

    const req = createMockRequest("PATCH", validBody);
    const res = await PATCH(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(json.error).toBe(
      "Unauthorized, you are not the author of this post",
    );
  });

  it("returns 404 when post not found", async () => {
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: "Not found" },
      }),
    );

    const req = createMockRequest("PATCH", validBody);
    const res = await PATCH(req, mockParamsWithPostId);

    expect(res.status).toBe(404);
  });

  it("returns 500 when supabase update fails", async () => {
    mockSupabase.single.mockImplementation(() =>
      Promise.resolve({
        data: { id: "post-1", author_id: "test-user" },
        error: null,
      }),
    );
    mockSupabase.maybeSingle.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: "Update failed" },
      }),
    );

    const req = createMockRequest("PATCH", validBody);
    const res = await PATCH(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Update failed");
  });
});

describe("DELETE /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    resetAll();
  });

  it("deletes a post successfully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { id: "post-1", author_id: "test-user" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "post-1", deleted_at: "2026-06-10" },
        error: null,
      });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);
    const json = await readJson<{ deleted_at: string | null }>(res);

    expect(res.status).toBe(200);
    expect(json.deleted_at).toBeTruthy();
    expect(mockSupabase.from).not.toHaveBeenCalledWith("comments");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: "post-1", author_id: "different-user" },
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(json.error).toBe(
      "Unauthorized, you are not the author of this post",
    );
  });

  it("returns 404 when post not found", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);

    expect(res.status).toBe(404);
  });

  it("returns 404 when post not found after soft-delete", async () => {
    // Query 1: find the post, confirm author
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: "post-1", author_id: "test-user" },
      error: null,
    });
    // Query 2: post soft-delete returns no data
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found or unauthorized");
  });

  it("returns 500 when soft-deleting post fails", async () => {
    // Query 1: find the post, confirm author
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: "post-1", author_id: "test-user" },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Post delete failed" },
    });

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);
    const json = await readJson<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(json.error).toBe("Post delete failed");
  });
});
