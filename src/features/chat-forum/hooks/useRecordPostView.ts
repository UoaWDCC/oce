import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export function useRecordPostView() {
  const supabase = createClient();

  const recordView = useCallback(
    async (postId: string) => {
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
    [supabase],
  );

  return { recordView };
}
