import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDaoShaman } from "../daoShaman";

function setup(overrides: Record<string, unknown> = {}) {
  const records: Record<string, unknown> = {
    dao_groups: { dao_id: "dao-a" },
    DAO: { Members: { shamans: [{ address: " 0xShaman " }] } },
    Student: {
      Wallet: [{ walletAddress: "0xordinary" }, { walletAddress: "0xSHAMAN" }],
    },
    ...overrides,
  };
  const queries = Object.fromEntries(
    Object.entries(records).map(([table, data]) => [
      table,
      {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      },
    ]),
  );
  const from = vi.fn((table: string) => queries[table]);
  return { queries, supabase: { from } as unknown as SupabaseClient };
}

describe("isDaoShaman", () => {
  it("matches any of the authenticated user's wallets, ignoring case and spaces", async () => {
    const { supabase, queries } = setup();

    await expect(isDaoShaman(supabase, "user-1", "group-a")).resolves.toBe(
      true,
    );
    expect(queries.dao_groups.eq).toHaveBeenCalledWith("id", "group-a");
    expect(queries.DAO.eq).toHaveBeenCalledWith("DAOID", "dao-a");
    expect(queries.Student.eq).toHaveBeenCalledWith("UID", "user-1");
  });

  it("uses the requested DAO's shamans rather than another DAO's roles", async () => {
    const { supabase } = setup({
      dao_groups: { dao_id: "dao-b" },
      DAO: { Members: { shamans: [{ address: "0xother-dao-shaman" }] } },
    });

    await expect(isDaoShaman(supabase, "user-1", "group-b")).resolves.toBe(
      false,
    );
  });

  it.each([
    { label: "missing group", records: { dao_groups: null } },
    { label: "unlinked group", records: { dao_groups: { dao_id: null } } },
    { label: "missing DAO", records: { DAO: null } },
    {
      label: "missing membership payload",
      records: { DAO: { Members: null } },
    },
    { label: "no shamans", records: { DAO: { Members: { shamans: [] } } } },
    {
      label: "empty shaman addresses",
      records: { DAO: { Members: { shamans: [{ address: " " }, {}] } } },
    },
    { label: "missing student", records: { Student: null } },
    { label: "missing wallets", records: { Student: { Wallet: null } } },
    { label: "no wallets", records: { Student: { Wallet: [] } } },
    {
      label: "ordinary member wallet",
      records: { Student: { Wallet: [{ walletAddress: "0xordinary" }] } },
    },
  ])("denies moderation for $label", async ({ records }) => {
    const { supabase } = setup(records);

    await expect(isDaoShaman(supabase, "user-1", "group-a")).resolves.toBe(
      false,
    );
  });

  it.each(["dao_groups", "DAO", "Student"])(
    "denies moderation when the %s lookup fails",
    async (table) => {
      const { supabase, queries } = setup();
      queries[table].maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      await expect(isDaoShaman(supabase, "user-1", "group-a")).resolves.toBe(
        false,
      );
    },
  );
});
