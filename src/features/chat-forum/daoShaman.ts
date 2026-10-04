import type { SupabaseClient } from "@supabase/supabase-js";

type DaoShamanRecord = { address?: string | null };
type DaoMembersPayload = { shamans?: DaoShamanRecord[] | null };
type StudentWalletEntry = { walletAddress?: string | null };

export async function isDaoShaman(
  supabase: SupabaseClient,
  userId: string,
  daoGroupId: string,
): Promise<boolean> {
  const { data: daoGroup } = await supabase
    .from("dao_groups")
    .select("dao_id")
    .eq("id", daoGroupId)
    .maybeSingle();
  if (!daoGroup?.dao_id) return false;

  const { data: dao } = await supabase
    .from("DAO")
    .select("Members")
    .eq("DAOID", daoGroup.dao_id)
    .maybeSingle();

  const shamans =
    (dao?.Members as DaoMembersPayload | null)?.shamans ?? [];
  const shamanAddresses = new Set(
    shamans
      .map((s) => s.address?.trim().toLowerCase())
      .filter((a): a is string => Boolean(a)),
  );
  if (shamanAddresses.size === 0) return false;

  const { data: student } = await supabase
    .from("Student")
    .select("Wallet")
    .eq("UID", userId)
    .maybeSingle();

  const wallets = (student?.Wallet as StudentWalletEntry[] | null) ?? [];
  return wallets.some((w) => {
    const address = w.walletAddress?.trim().toLowerCase();
    return address ? shamanAddresses.has(address) : false;
  });
}