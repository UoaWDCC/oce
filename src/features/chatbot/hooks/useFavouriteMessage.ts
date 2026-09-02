import { useEffect, useState } from "react";
import { patchFavourite } from "../api/favourite";
import { useConversation } from "../providers/ConversationProvider";

export function useFavouriteMessage(
  messageId: string | undefined,
  initialFavourited: boolean,
) {
  const [favourited, setFavourited] = useState(initialFavourited);
  const { refreshFavourites } = useConversation();

  useEffect(() => {
    setFavourited(initialFavourited);
  }, [initialFavourited]);

  const toggleFavourite = async () => {
    if (!messageId) return;

    const next = !favourited;
    setFavourited(next);

    try {
      await patchFavourite(messageId, next);
      refreshFavourites();
    } catch {
      setFavourited(!next);
    }
  };

  return { favourited, toggleFavourite };
}
