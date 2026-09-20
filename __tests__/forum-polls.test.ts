import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  POST,
} from "@/app/api/dao-forum/[daoGroupId]/posts/[postId]/poll/route";
import { createMockRequest, mockSupabase, readJson, resetAll } from "./helpers";
import type { ForumPoll } from "@app-types/dao-forum";

vi.mock("@/utils/authHelper", () => ({ authenticateUser: vi.fn() }));
vi.mock("@/utils/daoMembership", () => ({ checkDAOMembership: vi.fn() }));

const context = {
  params: Promise.resolve({ daoGroupId: "dao-1", postId: "post-1" }),
};

const poll: ForumPoll = {
  id: "poll-1",
  question: "Choose options",
  allowMultiple: true,
  totalVoters: 1,
  options: [
    { id: "option-1", label: "One", voteCount: 1, isSelected: true },
    { id: "option-2", label: "Two", voteCount: 0, isSelected: false },
  ],
};

describe("DAO forum poll API", () => {
  beforeEach(resetAll);

  it("returns the poll and aggregated results", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: poll, error: null });

    const res = await GET(createMockRequest("GET"), context);
    const json = await readJson<{ poll: ForumPoll }>(res);

    expect(res.status).toBe(200);
    expect(json.poll).toEqual(poll);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_forum_poll", {
      p_post_id: "post-1",
    });
  });

  it("replaces the current user's selections and returns fresh results", async () => {
    const updated = {
      ...poll,
      options: poll.options.map((option) => ({
        ...option,
        isSelected: true,
      })),
    };
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: poll, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: updated, error: null });

    const res = await POST(
      createMockRequest("POST", { optionIds: ["option-1", "option-2"] }),
      context,
    );
    const json = await readJson<{ poll: ForumPoll }>(res);

    expect(res.status).toBe(200);
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(
      2,
      "submit_forum_poll_vote",
      { p_poll_id: "poll-1", p_option_ids: ["option-1", "option-2"] },
    );
    expect(json.poll).toEqual(updated);
  });

  it("rejects duplicate selections before calling the voting function", async () => {
    const res = await POST(
      createMockRequest("POST", { optionIds: ["option-1", "option-1"] }),
      context,
    );

    expect(res.status).toBe(400);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects multiple selections for a single-choice poll", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { ...poll, allowMultiple: false },
      error: null,
    });

    const res = await POST(
      createMockRequest("POST", {
        optionIds: ["option-1", "option-2"],
      }),
      context,
    );

    expect(res.status).toBe(400);
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects an option that does not belong to the poll", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: poll, error: null });

    const res = await POST(
      createMockRequest("POST", { optionIds: ["another-poll-option"] }),
      context,
    );

    expect(res.status).toBe(400);
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
  });
});
