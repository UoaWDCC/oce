import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function setFavourite(
  req: NextRequest,
  messageId: string,
  value: boolean,
) {
  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { data: message, error: fetchError } = await supabaseAdmin
    .from("messages")
    .select("role, conversations!inner(user_id)")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (
    !message ||
    (message.conversations as unknown as { user_id: string }).user_id !==
      user.id
  ) {
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  if (message.role !== "assistant") {
    return NextResponse.json(
      { error: "Only AI messages can be favourited" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("messages")
    .update({
      is_favourite: value,
      favourited_at: value ? new Date().toISOString() : null,
    })
    .eq("id", messageId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(updated, { headers: corsHeaders });
}
