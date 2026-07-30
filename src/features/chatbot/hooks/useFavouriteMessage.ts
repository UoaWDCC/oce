import { useState } from "react";
import { patchFavourite } from "../api/favourite";

export function useFavouriteMessage(
  messageId: string | undefined,
  initialFavourited: boolean,
) {
  const [favourited, setFavourited] = useState(initialFavourited);

  const toggleFavourite = async () => {
    if (!messageId) return;

    const next = !favourited;
    setFavourited(next);

    setFavourited(await patchFavourite(messageId, next));
  };

  return { favourited, toggleFavourite };
}
