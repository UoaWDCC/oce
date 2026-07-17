import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useFavouriteMessage(
  messageId: string | undefined,
  initialFavourited: boolean,
) {
  const [favourited, setFavourited] = useState(initialFavourited);

  const toggleFavourite = async () => {
    if (!messageId) return;

    const next = !favourited;
    setFavourited(next);

    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();

      const res = await fetch(
        `/api/ai-tutor/messages/${messageId}/${next ? "favourite" : "unfavourite"}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );

      if (!res.ok) {
        setFavourited(!next);
      }
    } catch {
      setFavourited(!next);
    }
  };

  return { favourited, toggleFavourite };
}
