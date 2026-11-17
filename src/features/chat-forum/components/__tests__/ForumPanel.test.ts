import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ForumPanel from "../ForumPanel";
import { PENDING_ASYNC_STATE } from "../../lib/asyncState";

vi.mock("@/components/dao-forum/NewPostDialog", () => ({
  default: () => null,
}));

afterEach(cleanup);

describe("ForumPanel post states", () => {
  it("hides zero counts and empty states while posts have not loaded", () => {
    render(
      createElement(ForumPanel, {
        daoGroupId: "dao-1",
        daoName: "Test DAO",
        posts: [],
        postsState: PENDING_ASYNC_STATE,
      }),
    );

    expect(screen.getByText("Loading posts…")).toBeDefined();
    expect(screen.getByLabelText("Loading forum posts")).toBeDefined();
    expect(screen.queryByText(/0 posts/)).toBeNull();
    expect(screen.queryByText(/No posts match/)).toBeNull();
  });

  it("shows an initial error and Retry without claiming the forum is empty", () => {
    const retry = vi.fn();
    render(
      createElement(ForumPanel, {
        daoGroupId: "dao-1",
        daoName: "Test DAO",
        posts: [],
        error: "Could not load posts.",
        postsState: {
          ...PENDING_ASYNC_STATE,
          isInitialLoading: false,
          isBlockingError: true,
          error: new Error("Could not load posts."),
          retry,
        },
      }),
    );

    expect(screen.getByText("Posts unavailable")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load posts.",
    );
    expect(screen.queryByText(/0 posts/)).toBeNull();
    expect(screen.queryByText(/No posts match/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
