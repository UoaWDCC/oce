import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommentViewSearchParams } from "../useCommentViewSearchParams";

const router = { push: vi.fn(), replace: vi.fn() };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dao/dao-1",
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  searchParams = new URLSearchParams();
});

describe("useCommentViewSearchParams", () => {
  it("reads the sort and filter from the URL", () => {
    searchParams = new URLSearchParams(
      "commentSort=oldest&reaction=heart&minReactions=4",
    );

    const { result } = renderHook(() => useCommentViewSearchParams("latest"));

    expect(result.current.sort).toBe("oldest");
    expect(result.current.filter).toEqual({ reaction: "heart", minCount: 4 });
  });

  it("follows the URL when the browser navigates back", () => {
    searchParams = new URLSearchParams("reaction=fire");
    const { result, rerender } = renderHook(() =>
      useCommentViewSearchParams("latest"),
    );
    expect(result.current.filter.reaction).toBe("fire");

    searchParams = new URLSearchParams();
    rerender();

    expect(result.current.filter.reaction).toBe("all");
  });

  it("pushes a history entry for a new sort or reaction type", () => {
    const { result } = renderHook(() => useCommentViewSearchParams("latest"));

    result.current.setSort("most_reacted");
    result.current.setFilter({ reaction: "fire", minCount: 0 });

    expect(router.push).toHaveBeenNthCalledWith(
      1,
      "/dao/dao-1?commentSort=most_reacted",
      { scroll: false },
    );
    expect(router.push).toHaveBeenNthCalledWith(2, "/dao/dao-1?reaction=fire", {
      scroll: false,
    });
  });

  it("replaces the entry while the minimum count is edited", () => {
    searchParams = new URLSearchParams("reaction=fire");
    const { result } = renderHook(() => useCommentViewSearchParams("latest"));

    result.current.setFilter({ reaction: "fire", minCount: 12 });

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith(
      "/dao/dao-1?reaction=fire&minReactions=12",
      { scroll: false },
    );
  });

  it("drops the query string when everything is back to defaults", () => {
    searchParams = new URLSearchParams("reaction=fire&minReactions=2");
    const { result } = renderHook(() => useCommentViewSearchParams("latest"));

    result.current.setFilter({ reaction: "all", minCount: 0 });

    expect(router.push).toHaveBeenCalledWith("/dao/dao-1", { scroll: false });
  });
});
