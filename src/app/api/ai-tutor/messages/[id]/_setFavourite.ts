import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

export async function setFavourite(
  req: NextRequest,
  messageId: string,
  value: boolean,
) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: message, error: fetchError } = await supabaseAdmin
    .from("messages")
    .select("role, conversations!inner(user_id)")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (
    !message ||
    (message.conversations as unknown as { user_id: string }).user_id !==
      user.id
  ) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.role !== "assistant") {
    return NextResponse.json(
      { error: "Only AI messages can be favourited" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("messages")
    .update({ is_favourite: value })
    .eq("id", messageId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
