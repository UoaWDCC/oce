import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import {
  GET as listGET,
  POST,
} from "@/app/api/dao-forum/[daoGroupId]/posts/route";
import {
  GET as singleGET,
  PATCH,
  DELETE,
} from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/route";

vi.mock("@/utils/authHelper", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/utils/daoMembership", () => ({
  checkDAOMembership: vi.fn(),
}));

const mockUser = { id: "test-user", email: "test@example.com" };
let mockQueryResult: { data: any; error: any } = { data: [], error: null };

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn(() => Promise.resolve(mockQueryResult)),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve(mockQueryResult)),
  maybeSingle: vi.fn(() => Promise.resolve(mockQueryResult)),
};

function resetMockSupabase() {
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.insert.mockReturnThis();
  mockSupabase.update.mockReturnThis();
  mockSupabase.order.mockImplementation(() => Promise.resolve(mockQueryResult));
  mockSupabase.single.mockImplementation(() =>
    Promise.resolve(mockQueryResult),
  );
  mockSupabase.maybeSingle.mockImplementation(() =>
    Promise.resolve(mockQueryResult),
  );
}

const mockParamsWithPostId = {
  params: Promise.resolve({ daoGroupId: "dao-1", postId: "post-1" }),
};

function createMockRequest(method: string, body?: object): NextRequest {
  const url = "http://localhost/api/dao-forum/dao-1/posts";
  const options: RequestInit = {
    method,
    headers: { Authorization: "Bearer fake-token" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest(url, options);
}

const mockParams = { params: Promise.resolve({ daoGroupId: "dao-1" }) };

describe("GET /api/dao-forum/[daoGroupId]/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: [], error: null };
    resetMockSupabase();
    vi.mocked(authenticateUser).mockResolvedValue({
      supabase: mockSupabase as any,
      user: mockUser as any,
      accessToken: "fake-token",
    });
  });

  it("returns posts on success", async () => {
    const fakePosts = [{ id: "post-1", title: "Hello" }];
    mockQueryResult = { data: fakePosts, error: null };

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(fakePosts);
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
    mockQueryResult = { data: null, error: { message: "DB error" } };

    const req = createMockRequest("GET");
    const res = await listGET(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB error");
  });
});

describe("POST /api/dao-forum/[daoGroupId]/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: [], error: null };
    resetMockSupabase();
    vi.mocked(authenticateUser).mockResolvedValue({
      supabase: mockSupabase as any,
      user: mockUser as any,
      accessToken: "fake-token",
    });
    vi.mocked(checkDAOMembership).mockResolvedValue(true);
  });

  it("creates a post successfully", async () => {
    const newPost = { id: "post-new", title: "New Post" };
    mockQueryResult = { data: newPost, error: null };

    const req = createMockRequest("POST", {
      title: "New Post",
      body: "Content",
      post_type_id: 1,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(newPost);
  });

  it("returns 400 when missing required fields", async () => {
    const req = createMockRequest("POST", {
      title: "",
      body: "",
      post_type_id: 0,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authenticateUser).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = createMockRequest("POST", {
      title: "Post",
      body: "Content",
      post_type_id: 1,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a DAO member", async () => {
    vi.mocked(checkDAOMembership).mockResolvedValue(false);

    const req = createMockRequest("POST", {
      title: "Post",
      body: "Content",
      post_type_id: 1,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(403);
  });

  it("returns 409 on duplicate conflict", async () => {
    mockQueryResult = {
      data: null,
      error: { code: "23505", message: "Conflict" },
    };

    const req = createMockRequest("POST", {
      title: "Post",
      body: "Content",
      post_type_id: 1,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("Conflict with existing state");
  });

  it("returns 500 when supabase insert fails", async () => {
    mockQueryResult = { data: null, error: { message: "Insert failed" } };

    const req = createMockRequest("POST", {
      title: "Post",
      body: "Content",
      post_type_id: 1,
      anonymous: false,
      is_pinned: false,
      image_url: null,
    });
    const res = await POST(req, mockParams);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Insert failed");
  });
});

describe("GET /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: [], error: null };
    resetMockSupabase();
    vi.mocked(authenticateUser).mockResolvedValue({
      supabase: mockSupabase as any,
      user: mockUser as any,
      accessToken: "fake-token",
    });
  });

  it("returns a single post on success", async () => {
    const fakePost = { id: "post-1", title: "Hello", author_id: "test-user" };
    mockQueryResult = { data: fakePost, error: null };

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await res.json();

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
    mockQueryResult = { data: null, error: null };

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Post not found");
  });

  it("returns 500 when supabase errors", async () => {
    mockQueryResult = { data: null, error: { message: "DB error" } };

    const req = createMockRequest("GET");
    const res = await singleGET(req, mockParamsWithPostId);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB error");
  });
});

describe("PATCH /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: null, error: null };
    resetMockSupabase();
    vi.mocked(authenticateUser).mockResolvedValue({
      supabase: mockSupabase as any,
      user: mockUser as any,
      accessToken: "fake-token",
    });
  });

  const validBody = {
    title: "Updated",
    body: "Updated body",
    post_type_id: 1,
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
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Updated");
  });

  it("returns 400 when missing required fields", async () => {
    const req = createMockRequest("PATCH", { title: "Only title" });
    const res = await PATCH(req, mockParamsWithPostId);

    expect(res.status).toBe(400);
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
    const json = await res.json();

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
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Update failed");
  });
});

describe("DELETE /api/dao-forum/[daoGroupId]/posts/[postId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: null, error: null };
    resetMockSupabase();
    vi.mocked(authenticateUser).mockResolvedValue({
      supabase: mockSupabase as any,
      user: mockUser as any,
      accessToken: "fake-token",
    });
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
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.deleted_at).toBeTruthy();
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
    const json = await res.json();

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

  it("returns 500 when soft-deleting comments fails", async () => {
    // Query 1: find the post and confirm author
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: "post-1", author_id: "test-user" },
      error: null,
    });
    // .eq() calls 1 & 2 are for post lookup
    // .eq() call 3 is the terminal call for comments soft-delete - should return error
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(
        Promise.resolve({
          data: null,
          error: { message: "Comments delete failed" },
        }),
      );

    const req = createMockRequest("DELETE");
    const res = await DELETE(req, mockParamsWithPostId);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Comments delete failed");
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
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Post delete failed");
  });
});
