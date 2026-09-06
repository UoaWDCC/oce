import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFavouriteMessages } from "../../api/favourite";
import { useFavourites } from "../useFavourites";
import type { FavouriteMessage } from "../../types";

vi.mock("../../api/favourite", () => ({
  getFavouriteMessages: vi.fn(),
}));

const getFavouriteMessagesMock = vi.mocked(getFavouriteMessages);

const favourite: FavouriteMessage = {
  id: "message-1",
  content: "Saved response",
  conversation_id: "conversation-1",
  conversation_title: "Conversation",
  created_at: "2026-09-01T00:00:00.000Z",
  favourited_at: "2026-09-02T00:00:00.000Z",
};

beforeEach(() => {
  getFavouriteMessagesMock.mockReset();
});

describe("useFavourites", () => {
  it("does not reuse favourites as initial state across hook mounts", async () => {
    getFavouriteMessagesMock.mockResolvedValueOnce([favourite]);

    const first = renderHook(() => useFavourites(0));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current.favourites).toEqual([favourite]);
    first.unmount();

    let resolveSecond: (value: FavouriteMessage[]) => void = () => {};
    getFavouriteMessagesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );

    const second = renderHook(() => useFavourites(0));
    expect(second.result.current.favourites).toEqual([]);
    expect(second.result.current.isLoading).toBe(true);

    await act(async () => resolveSecond([]));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
  });
});
