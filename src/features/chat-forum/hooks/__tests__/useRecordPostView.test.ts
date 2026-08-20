import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordPostView } from "../useRecordPostView";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ rpc: rpcMock }),
}));

beforeEach(() => {
  rpcMock.mockReset();
});

describe("useRecordPostView", () => {
  it("does not record a view before authentication resolves", async () => {
    const { result } = renderHook(() => useRecordPostView(undefined));
    let succeeded = true;

    await act(async () => {
      succeeded = await result.current.recordView("post-1");
    });

    expect(succeeded).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("records the selected post through the protected RPC", async () => {
    rpcMock.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useRecordPostView("token-123"));
    let succeeded = false;

    await act(async () => {
      succeeded = await result.current.recordView("post-1");
    });

    expect(succeeded).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("record_post_view", {
      p_post_id: "post-1",
    });
  });

  it("reports a failed view write so the post list is not falsely refreshed", async () => {
    rpcMock.mockResolvedValue({ error: { message: "Forbidden" } });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useRecordPostView("token-123"));
    let succeeded = true;

    await act(async () => {
      succeeded = await result.current.recordView("post-1");
    });

    expect(succeeded).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to record post view:",
      "Forbidden",
    );
    consoleError.mockRestore();
  });
});
