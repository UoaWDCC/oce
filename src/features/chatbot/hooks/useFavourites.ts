"use client";

import { useEffect, useState } from "react";
import { FavouriteMessage } from "../types";
import { getFavouriteMessages } from "../api/favourite";

let cachedFavourites: FavouriteMessage[] | null = null;

export function useFavourites(version: number) {
  const [favourites, setFavourites] = useState<FavouriteMessage[]>(
    () => cachedFavourites ?? [],
  );
  const [isLoading, setIsLoading] = useState(() => cachedFavourites === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    if (cachedFavourites === null) {
      setIsLoading(true);
    }
    setError(null);

    getFavouriteMessages()
      .then((data) => {
        if (!ignore) {
          cachedFavourites = data;
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
    setFavourites((prev) => {
      const next = updater(prev);
      cachedFavourites = next;
      return next;
    });
  };

  return { favourites, isLoading, error, setFavourites: updateFavourites };
}
