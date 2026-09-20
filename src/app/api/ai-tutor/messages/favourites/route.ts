import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(
      "id, content, conversation_id, created_at, favourited_at, conversations!inner(user_id, title)",
    )
    .eq("is_favourite", true)
    .eq("role", "assistant")
    .eq("conversations.user_id", user.id)
    .order("favourited_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const messages = data.map((row) => {
    const conversation = row.conversations as unknown as
      | { title?: string | null }
      | undefined;
    return {
      id: row.id,
      content: row.content,
      conversation_id: row.conversation_id,
      conversation_title: conversation?.title ?? null,
      created_at: row.created_at,
      favourited_at: row.favourited_at,
    };
  });

  return NextResponse.json({ messages }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
