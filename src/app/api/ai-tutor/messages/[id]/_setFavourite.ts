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
    .single();

  console.log("DEBUG messageId:", messageId);
  console.log("DEBUG message:", JSON.stringify(message, null, 2));
  console.log("DEBUG fetchError:", fetchError);
  console.log("DEBUG user.id:", user.id);

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

  const { data: updated, error } = await supabaseAdmin
    .from("messages")
    .update({ is_favourite: value })
    .eq("id", messageId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
