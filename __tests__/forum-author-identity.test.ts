import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadDaoAuthorIdentities,
  resolveForumAuthorLabel,
} from "@/features/chat-forum/authorIdentity";

describe("forum author identity", () => {
  const walletAddress = "0x1234567890123456789012345678901234567890";

  it.each([
    ["thewallet", "thewallet"],
    [" My Wallet ", "My Wallet"],
    ["alice.eth", "alice.eth"],
    ["thewallet.onchaineducation.eth", "thewallet"],
    ["thewallet.ONCHAINEDUCATION.ETH", "thewallet"],
    [" ", walletAddress],
    [null, walletAddress],
  ])("resolves stored ENS value %s", (ensName, expected) => {
    expect(resolveForumAuthorLabel({ ensName, walletAddress }, "Unknown")).toBe(
      expected,
    );
  });

  it("returns Unknown when neither an ENS name nor wallet is available", () => {
    expect(resolveForumAuthorLabel(null, "Unknown")).toBe("Unknown");
  });

  it("preserves stored ENS values and wallet fallbacks from Student records", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { UID: "named", Wallet: [{ walletAddress, ENS: "thewallet" }] },
          { UID: "unnamed", Wallet: [{ walletAddress, ENS: "" }] },
          { UID: "empty", Wallet: null },
        ],
        error: null,
      }),
    };
    const client = { from: vi.fn().mockReturnValue(query) };
    const identities = await loadDaoAuthorIdentities(
      client as unknown as SupabaseClient,
      ["named", "unnamed", "empty", "missing", "named"],
    );
    expect(identities).toEqual({
      named: { walletAddress, ensName: "thewallet" },
      unnamed: { walletAddress, ensName: null },
    });
    expect(query.select).toHaveBeenCalledWith("UID, Wallet");
    expect(query.in).toHaveBeenCalledWith("UID", [
      "named",
      "unnamed",
      "empty",
      "missing",
    ]);
  });
});
