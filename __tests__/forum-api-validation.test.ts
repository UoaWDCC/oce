import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockSupabase, resetAll } from "./helpers";
import { POST as createPost } from "@/app/api/dao-forum/[daoGroupId]/posts/route";
import { PATCH as updatePost } from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/route";
import { POST as createComment } from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/comments/route";
import { PATCH as updateComment } from "@/app/api/comments/[commentId]/route";
import { POST as vote } from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/poll/route";

vi.mock("@/utils/authHelper", () => ({ authenticateUser: vi.fn() }));
vi.mock("@/utils/daoMembership", () => ({ checkDAOMembership: vi.fn() }));

const postContext = {
  params: Promise.resolve({ daoGroupId: "dao-1", postId: "post-1" }),
};
const routes = [
  {
    name: "create post",
    run: (req: NextRequest) => createPost(req, postContext),
  },
  {
    name: "update post",
    run: (req: NextRequest) => updatePost(req, postContext),
  },
  {
    name: "create comment",
    run: (req: NextRequest) => createComment(req, postContext),
  },
  {
    name: "update comment",
    run: (req: NextRequest) =>
      updateComment(req, {
        params: Promise.resolve({ commentId: "comment-1" }),
      }),
  },
  { name: "vote", run: (req: NextRequest) => vote(req, postContext) },
];

describe.each(routes)("$name request validation", ({ run }) => {
  beforeEach(() => {
    resetAll();
    mockSupabase.maybeSingle.mockResolvedValue({
      data: { deleted_at: null },
      error: null,
    });
  });

  it.each(["null", "[]", "1", '"text"', "{"])(
    "rejects invalid JSON object %s without writing",
    async (body) => {
      const req = new NextRequest("http://localhost/api/forum", {
        method: "POST",
        headers: { Authorization: "Bearer fake-token" },
        body,
      });
      const res = await run(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid JSON body" });
      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(mockSupabase.update).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    },
  );
});
