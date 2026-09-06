"use client";

import { useEffect, useState } from "react";
import { FavouriteMessage } from "../types";
import { getFavouriteMessages } from "../api/favourite";

export function useFavourites(version: number) {
  const [favourites, setFavourites] = useState<FavouriteMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);

    getFavouriteMessages()
      .then((data) => {
        if (!ignore) {
          setFavourites(data);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load favourite messages.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [version]);

  const updateFavourites = (
    updater: (prev: FavouriteMessage[]) => FavouriteMessage[],
  ) => {
    setFavourites(updater);
  };

  return { favourites, isLoading, error, setFavourites: updateFavourites };
}
