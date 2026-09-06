import { useEffect, useRef, useState } from "react";
import { patchFavourite } from "../api/favourite";
import { useConversation } from "../providers/ConversationProvider";

export function useFavouriteMessage(
  messageId: string | undefined,
  initialFavourited: boolean,
) {
  const [favourited, setFavourited] = useState(initialFavourited);
  const [isPending, setIsPending] = useState(false);
  const isPendingRef = useRef(false);
  const { refreshFavourites } = useConversation();

  useEffect(() => {
    setFavourited(initialFavourited);
  }, [initialFavourited]);

  const toggleFavourite = async () => {
    if (!messageId || isPendingRef.current) return;

    isPendingRef.current = true;
    setIsPending(true);
    const next = !favourited;
    setFavourited(next);

    try {
      await patchFavourite(messageId, next);
      refreshFavourites();
    } catch {
      setFavourited(!next);
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
    }
  };

  return { favourited, toggleFavourite, isPending };
}
