import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PostThread from "../PostThread";
import {
  PENDING_ASYNC_STATE,
  type ForumAsyncState,
} from "../../lib/asyncState";
import type {
  ForumCommentFilter,
  ForumThreadComment,
  ForumThreadPost,
  ForumThreadSort,
} from "../../types";

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
  sort?: ForumThreadSort;
  filter?: ForumCommentFilter;
  onSortChange?: (sort: ForumThreadSort) => void;
  onFilterChange?: (filter: ForumCommentFilter) => void;
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
      commentsState: state({
        isInitialLoading: false,
        error: new Error("boom"),
        isBlockingError: true,
      }),
    });

    expect(screen.queryByText(/No replies yet/)).toBeNull();
    expect(screen.queryByText(/0 Replies/)).toBeNull();
    expect(screen.queryByText(/0 comments/)).toBeNull();
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

describe("PostThread sort and filter panel", () => {
  const fireFilter: ForumCommentFilter = { reaction: "fire", minCount: 1 };

  function openPanel() {
    fireEvent.click(screen.getByRole("button", { name: /Sort & filter/ }));
    return screen.getByRole("dialog", { name: "Sort and filter replies" });
  }

  it("keeps the panel closed until the button is pressed", () => {
    renderThread({
      comments,
      commentsState: resolved(),
      onSortChange: vi.fn(),
    });

    const button = screen.getByRole("button", { name: /Sort & filter/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();

    openPanel();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows Most reacted as the selected sort, on the button and in the panel", () => {
    renderThread({
      comments,
      commentsState: resolved(),
      sort: "most_reacted",
      onSortChange: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: /Sort & filter/ }).textContent,
    ).toContain("Most reacted");
    openPanel();
    expect(
      (screen.getByRole("radio", { name: "Most reacted" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.queryByRole("radio", { name: "Most liked" })).toBeNull();
  });

  it("sends sort, reaction type and minimum count changes", () => {
    const onSortChange = vi.fn();
    const onFilterChange = vi.fn();
    renderThread({
      comments,
      commentsState: resolved(),
      onSortChange,
      onFilterChange,
    });
    openPanel();

    fireEvent.click(screen.getByRole("radio", { name: "Oldest" }));
    fireEvent.click(screen.getByRole("radio", { name: "Fire" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Increase minimum reactions" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Minimum reactions" }),
      { target: { value: "3" } },
    );

    expect(onSortChange).toHaveBeenCalledWith("oldest");
    expect(onFilterChange).toHaveBeenNthCalledWith(1, {
      reaction: "fire",
      minCount: 0,
    });
    expect(onFilterChange).toHaveBeenNthCalledWith(2, {
      reaction: "all",
      minCount: 1,
    });
    expect(onFilterChange).toHaveBeenNthCalledWith(3, {
      reaction: "all",
      minCount: 3,
    });
  });

  it("does not step the minimum below 0 or accept a non-whole number", () => {
    const onFilterChange = vi.fn();
    renderThread({ comments, commentsState: resolved(), onFilterChange });
    openPanel();

    const decrease = screen.getByRole("button", {
      name: "Decrease minimum reactions",
    }) as HTMLButtonElement;
    expect(decrease.disabled).toBe(true);

    const input = screen.getByRole("spinbutton", {
      name: "Minimum reactions",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onFilterChange).not.toHaveBeenCalled();
    expect(input.value).toBe("0");
  });

  it("summarises an active filter on the button and resets it from the panel", () => {
    const onFilterChange = vi.fn();
    renderThread({
      comments,
      commentsState: resolved(),
      sort: "latest",
      filter: { reaction: "fire", minCount: 2 },
      onFilterChange,
    });

    expect(
      screen.getByRole("button", { name: /Sort & filter/ }).textContent,
    ).toContain("Latest · 🔥 ≥2");

    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onFilterChange).toHaveBeenCalledWith({
      reaction: "all",
      minCount: 0,
    });
  });

  it("closes on Escape and on Done, returning focus to the button", () => {
    renderThread({
      comments,
      commentsState: resolved(),
      onSortChange: vi.fn(),
    });
    const button = screen.getByRole("button", { name: /Sort & filter/ });

    openPanel();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);

    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a filtered empty state that resets the filter", () => {
    const onFilterChange = vi.fn();
    renderThread({
      comments: [],
      commentsState: resolved(),
      filter: fireFilter,
      onFilterChange,
    });

    expect(
      screen.getByText("No replies match this reaction filter."),
    ).toBeDefined();
    expect(screen.queryByText(/No replies yet/)).toBeNull();
    expect(screen.getByText("0 Matching replies")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onFilterChange).toHaveBeenCalledWith({
      reaction: "all",
      minCount: 0,
    });
  });

  it("labels a context-only parent and counts only matching replies", () => {
    renderThread({
      comments: [
        {
          id: "parent",
          body: "Parent without fire",
          author: { name: "Grace" },
          createdAt: "2026-09-02T00:00:00.000Z",
          createdAtLabel: "2 Sep",
          isContextOnly: true,
          replies: [
            {
              id: "reply",
              body: "Reply with fire",
              author: { name: "Ada" },
              createdAt: "2026-09-03T00:00:00.000Z",
              createdAtLabel: "3 Sep",
              reactionCounts: {
                heart: 0,
                thumbs_up: 0,
                fire: 2,
                thumbs_down: 0,
              },
            },
          ],
        },
      ],
      commentsState: resolved(),
      filter: fireFilter,
      onFilterChange: vi.fn(),
    });

    expect(screen.getAllByText(/Shown for context/)).toHaveLength(1);
    expect(screen.getByText("Reply with fire")).toBeDefined();
    expect(screen.getByText("1 Matching reply")).toBeDefined();
    // The post total is unknown while filtered, so it is not shown.
    expect(screen.queryByText(/^1 comment$/)).toBeNull();
  });
});
