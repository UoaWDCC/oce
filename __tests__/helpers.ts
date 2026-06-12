import { vi } from "vitest";
import { NextRequest } from "next/server";

import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";

// --- Mock data ---

export const mockUser = { id: "test-user", email: "test@example.com" };

export const defaultPostBody = {
  title: "Post",
  body: "Content",
  post_type_id: 1,
  anonymous: false,
  is_pinned: false,
  image_url: null,
};

export const defaultCommentBody = {
  parent_comment_id: null,
  body: "Comment Body",
  image_url: "example.png",
};

// --- Mock Supabase client ---

let mockQueryResult: { data: any; error: any } = { data: [], error: null };

export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn(() => Promise.resolve({ data: [], error: null })),
  order: vi.fn(() => Promise.resolve(mockQueryResult)),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve(mockQueryResult)),
  maybeSingle: vi.fn(() => Promise.resolve(mockQueryResult)),
};

export function setMockQueryResult(result: { data: any; error: any }) {
  mockQueryResult = result;
}

export function resetMockSupabase() {
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.in.mockImplementation(() =>
    Promise.resolve({ data: [], error: null }),
  );
  mockSupabase.insert.mockReturnThis();
  mockSupabase.update.mockReturnThis();
  mockSupabase.delete.mockReturnThis();
  mockSupabase.order.mockImplementation(() => Promise.resolve(mockQueryResult));
  mockSupabase.single.mockImplementation(() =>
    Promise.resolve(mockQueryResult),
  );
  mockSupabase.maybeSingle.mockImplementation(() =>
    Promise.resolve(mockQueryResult),
  );
}

// --- Setup & utilities ---

export function resetAll() {
  vi.clearAllMocks();
  mockQueryResult = { data: [], error: null };
  resetMockSupabase();
  vi.mocked(authenticateUser).mockResolvedValue({
    supabase: mockSupabase as any,
    user: mockUser as any,
    accessToken: "fake-token",
  });
  vi.mocked(checkDAOMembership).mockResolvedValue(true);
}

export function createMockRequest(
  method: string,
  body?: object,
  url = "http://localhost/api/dao-forum/dao-1/posts",
): NextRequest {
  const options: ConstructorParameters<typeof NextRequest>[1] = {
    method,
    headers: { Authorization: "Bearer fake-token" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest(url, options);
}

export function readJson<T>(response: Response): Promise<T> {
  return response.json<T>();
}
