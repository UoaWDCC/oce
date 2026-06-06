import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

const createSchema = z.object({
  conversation_id: z.string().uuid(),
  question: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "conversation_id (uuid) and question are required" },
      { status: 400 },
    );
  }
  const { conversation_id, question } = parsed.data;

  // Verify the conversation belongs to this user
  const { data: conversation, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("user_id")
    .eq("id", conversation_id)
    .maybeSingle();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  if (!conversation || conversation.user_id !== user.id) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from("tutor_requests")
    .insert({ conversation_id, question })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}

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
    .from("tutor_requests")
    .select(
      "id, conversation_id, question, status, created_at, conversations!inner(user_id)",
    )
    .eq("conversations.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = data.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    question: row.question,
    status: row.status,
    created_at: row.created_at,
  }));

  return NextResponse.json({ requests });
}
