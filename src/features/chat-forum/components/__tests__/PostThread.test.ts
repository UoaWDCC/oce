import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PostThread from "../PostThread";
import {
  PENDING_ASYNC_STATE,
  type ForumAsyncState,
} from "../../lib/asyncState";
import type { ForumThreadComment, ForumThreadPost } from "../../types";

// The poll is fetched by the thread itself and is not what these tests are
// about, so it is stubbed out to keep them off the network.
vi.mock("../../hooks/useDaoForumPoll", () => ({
  useDaoForumPoll: () => ({
    poll: null,
    isInitialLoading: false,
    isRefreshing: false,
    isVoting: false,
    error: null,
    retry: vi.fn(),
    vote: vi.fn(),
    refetch: vi.fn(),
  }),
}));

const post: ForumThreadPost = {
  id: "post-1",
  title: "How does quorum work?",
  body: "Asking for a friend.",
  tags: [],
  author: { name: "Ada" },
  createdAt: "2026-09-01T00:00:00.000Z",
  createdAtLabel: "1 Sep",
  viewCount: 3,
};

const comments: ForumThreadComment[] = [
  {
    id: "comment-1",
    body: "It is a percentage of circulating tokens.",
    author: { name: "Grace" },
    createdAt: "2026-09-02T00:00:00.000Z",
    createdAtLabel: "2 Sep",
  },
];

// Testing Library only auto-cleans when vitest runs with globals enabled,
// which this project does not, so each render is torn down explicitly.
afterEach(cleanup);

function state(overrides: Partial<ForumAsyncState> = {}): ForumAsyncState {
  return { ...PENDING_ASYNC_STATE, retry: vi.fn(), ...overrides };
}

/** A thread that finished loading successfully. */
function resolved(overrides: Partial<ForumAsyncState> = {}): ForumAsyncState {
  return state({ isInitialLoading: false, hasResolved: true, ...overrides });
}

function renderThread(props: {
  comments: ForumThreadComment[];
  commentsState: ForumAsyncState;
  commentsError?: string;
}) {
  return render(
    createElement(PostThread, { daoGroupId: "dao-1", post, ...props }),
  );
}

describe("PostThread comment states", () => {
  it("shows a skeleton and withholds the count on first load", () => {
    renderThread({ comments: [], commentsState: state() });

    expect(screen.getByLabelText("Loading replies")).toBeDefined();
    expect(screen.getByText("Replies")).toBeDefined();
    expect(screen.queryByText(/0 Replies/)).toBeNull();
    expect(screen.queryByText(/0 comments/)).toBeNull();
    expect(screen.queryByText(/No replies yet/)).toBeNull();
  });

  it("keeps replies on screen during a background refresh", () => {
    renderThread({ comments, commentsState: resolved({ isRefreshing: true }) });

    expect(screen.getByText(comments[0].body)).toBeDefined();
    expect(screen.queryByLabelText("Loading replies")).toBeNull();
  });

  it("keeps replies on screen when a background refresh fails, and offers a retry", () => {
    const retry = vi.fn();
    renderThread({
      comments,
      commentsError: "Could not refresh replies.",
      commentsState: resolved({ error: new Error("network down"), retry }),
    });

    // The whole point of the issue: a failed refresh must not take the thread
    // away, and the user needs a way out of the failure.
    expect(screen.getByText(comments[0].body)).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not refresh replies.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("suppresses the empty state when the first load fails outright", () => {
    renderThread({
      comments: [],
      commentsError: "Could not load replies.",
      commentsState: resolved({
        error: new Error("boom"),
        isBlockingError: true,
      }),
    });

    expect(screen.queryByText(/No replies yet/)).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load replies.",
    );
  });

  it("shows the empty state and the count once the thread has resolved", () => {
    renderThread({ comments: [], commentsState: resolved() });

    expect(screen.getByText(/No replies yet/)).toBeDefined();
    expect(screen.getByText("0 Replies")).toBeDefined();
  });
});
