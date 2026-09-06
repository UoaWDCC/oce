import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchFavourite } from "../../api/favourite";
import { useFavouriteMessage } from "../useFavouriteMessage";

const refreshFavourites = vi.fn();

vi.mock("../../api/favourite", () => ({
  patchFavourite: vi.fn(),
}));

vi.mock("../../providers/ConversationProvider", () => ({
  useConversation: () => ({ refreshFavourites }),
}));

const patchFavouriteMock = vi.mocked(patchFavourite);

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  patchFavouriteMock.mockReset();
  refreshFavourites.mockReset();
});

describe("useFavouriteMessage", () => {
  it("optimistically updates once and blocks concurrent toggle requests", async () => {
    const request = deferred();
    patchFavouriteMock.mockReturnValue(request.promise);
    const { result } = renderHook(() =>
      useFavouriteMessage("message-1", false),
    );

    let firstRequest: Promise<void> | undefined;
    act(() => {
      firstRequest = result.current.toggleFavourite();
      void result.current.toggleFavourite();
    });

    expect(result.current.favourited).toBe(true);
    expect(result.current.isPending).toBe(true);
    expect(patchFavouriteMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve();
      await firstRequest;
    });

    expect(result.current.isPending).toBe(false);
    expect(refreshFavourites).toHaveBeenCalledTimes(1);
  });

  it("rolls back the optimistic update when the request fails", async () => {
    patchFavouriteMock.mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() =>
      useFavouriteMessage("message-1", false),
    );

    await act(async () => {
      await result.current.toggleFavourite();
    });

    expect(result.current.favourited).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(refreshFavourites).not.toHaveBeenCalled();
  });
});
