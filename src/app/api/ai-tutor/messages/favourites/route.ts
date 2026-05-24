import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(
      "id, content, conversation_id, created_at, conversations!inner(user_id)",
    )
    .eq("is_favourite", true)
    .eq("role", "assistant")
    .eq("conversations.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = data.map((row) => ({
    id: row.id,
    content: row.content,
    conversation_id: row.conversation_id,
    created_at: row.created_at,
  }));

  return NextResponse.json({ messages });
}
