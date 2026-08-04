import { createClient } from "@/utils/supabase/client";
export async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("You must be logged in to use the AI Tutor.");
  }

  return accessToken;
}
