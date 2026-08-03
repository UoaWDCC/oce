import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export function useRecordPostView() {
  const supabase = createClient();

  const recordView = useCallback(
    async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("User not authenticated");
        return false;
      }

      const now = new Date().toISOString();

      // Check if a view record exists
      const { data: existingView } = await supabase
        .from("post_views")
        .select("id")
        .eq("post_id", postId)
        .eq("viewer_id", user.id)
        .single();

      if (existingView) {
        // Update existing record
        const { error } = await supabase
          .from("post_views")
          .update({ last_viewed_at: now })
          .eq("id", existingView.id);

        if (error) {
          console.error("Failed to update post view:", error.message);
          return false;
        }
      } else {
        // Insert new record
        const { error } = await supabase.from("post_views").insert({
          post_id: postId,
          viewer_id: user.id,
          last_viewed_at: now,
        });

        if (error) {
          console.error("Failed to record post view:", error.message);
          return false;
        }
      }

      return true;
    },
    [supabase],
  );

  return { recordView };
}
