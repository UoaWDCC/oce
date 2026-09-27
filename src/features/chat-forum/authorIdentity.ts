import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentWallet = {
  walletAddress?: string | null;
  ENS?: string | null;
};

export type ForumAuthorIdentity = {
  walletAddress: string;
  ensName: string | null;
};

export function resolveForumAuthorLabel(
  identity: { ensName?: string | null; walletAddress?: string | null } | null | undefined,
  fallback = "Anonymous",
): string {
  const ensName = identity?.ensName?.trim();
  if (ensName) return ensName;

  const walletAddress = identity?.walletAddress?.trim();
  if (walletAddress) return walletAddress;

  return fallback;
}

export async function loadDaoAuthorIdentities(
  supabase: SupabaseClient,
  authorIds: Array<string | null | undefined>,
): Promise<Record<string, ForumAuthorIdentity>> {
  const uniqueAuthorIds = [
    ...new Set(authorIds.filter((id): id is string => Boolean(id))),
  ];
  if (uniqueAuthorIds.length === 0) return {};

  const { data: students } = await supabase
    .from("Student")
    .select("UID, Wallet")
    .in("UID", uniqueAuthorIds);

  const identities: Record<string, ForumAuthorIdentity> = {};
  (students ?? []).forEach(
    (student: { UID?: string | null; Wallet?: StudentWallet[] | null }) => {
      if (!student.UID) return;
      const wallet = (student.Wallet ?? []).find(
        (w) => w.walletAddress?.trim(),
      );
      if (!wallet?.walletAddress) return;
      identities[student.UID] = {
        walletAddress: wallet.walletAddress.trim(),
        ensName: wallet.ENS?.trim() || null,
      };
    },
  );

  return identities;
}