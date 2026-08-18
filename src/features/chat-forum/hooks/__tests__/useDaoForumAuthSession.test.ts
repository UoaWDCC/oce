import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDaoForumAuthSession } from "../useDaoForumAuthSession";

const { onAuthStateChangeMock } = vi.hoisted(() => ({
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}));

describe("useDaoForumAuthSession", () => {
  it("starts in the loading state before any auth event fires", () => {
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    const { result } = renderHook(() => useDaoForumAuthSession());

    expect(result.current).toEqual({
      status: "loading",
      token: undefined,
      userId: null,
    });
  });

  it("becomes authenticated with a token once a session resolves", async () => {
    let emit: (
      session: { access_token: string; user: { id: string } } | null,
    ) => void = () => {};
    onAuthStateChangeMock.mockImplementation((callback) => {
      emit = (session) => callback("SIGNED_IN", session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useDaoForumAuthSession());
    emit({ access_token: "abc123", user: { id: "user-1" } });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "authenticated",
        token: "abc123",
        userId: "user-1",
      });
    });
  });

  it("becomes unauthenticated when there is no session", async () => {
    let emit: (
      session: { access_token: string; user: { id: string } } | null,
    ) => void = () => {};
    onAuthStateChangeMock.mockImplementation((callback) => {
      emit = (session) => callback("SIGNED_OUT", session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useDaoForumAuthSession());
    emit(null);

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "unauthenticated",
        token: undefined,
        userId: null,
      });
    });
  });

  it("unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = renderHook(() => useDaoForumAuthSession());
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
