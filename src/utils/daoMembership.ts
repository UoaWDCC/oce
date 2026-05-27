import type { SupabaseClient } from "@supabase/supabase-js";

export async function checkDAOMembership(
  supabase: SupabaseClient,
  userId: string,
  daoGroupId: string,
) {
  const { data } = await supabase
    .from("dao_members")
    .select("user_id")
    .eq("dao_group_id", daoGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}
