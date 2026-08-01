import { apiFetch } from "../utils/apiFetch";

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
