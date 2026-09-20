import { FavouriteMessage } from "../types";
import { apiFetch } from "../utils/apiFetch";

export async function getFavouriteMessages(): Promise<FavouriteMessage[]> {
  const response = await apiFetch(
    "/api/ai-tutor/messages/favourites",
    {},
    true,
  );
  const data = (await response.json()) as { messages?: FavouriteMessage[] };
  return data.messages ?? [];
}

export async function patchFavourite(
  messageId: string,
  next: boolean,
): Promise<void> {
  await apiFetch(
    `/api/ai-tutor/messages/${messageId}/${next ? "favourite" : "unfavourite"}`,
    {
      method: "PATCH",
    },
    true,
  );
}
