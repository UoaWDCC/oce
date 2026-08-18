import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export function useRecordPostView(token?: string) {
  const supabase = createClient();

  const recordView = useCallback(
    async (postId: string) => {
      if (!token) {
        // Not signed in: the RPC would be rejected by RLS anyway, so skip it.
        return false;
      }

      const { error } = await supabase.rpc("record_post_view", {
        p_post_id: postId,
      });

      if (error) {
        // 42501 = forbidden (RLS/membership check failed in the function)
        // P0002 = post not found
        console.error("Failed to record post view:", error.message);
      }

      return !error;
    },
    [supabase, token],
  );

  return { recordView };
}
