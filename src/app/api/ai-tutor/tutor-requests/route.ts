import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, getAdminClient } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const createSchema = z.object({
  conversation_id: z.string().uuid(),
  question: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "conversation_id (uuid) and question are required" },
      { status: 400, headers: corsHeaders },
    );
  }
  const { conversation_id, question } = parsed.data;

  const admin = getAdminClient();

  // Verify the conversation belongs to this user
  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("user_id")
    .eq("id", conversation_id)
    .maybeSingle();

  if (convError) {
    return NextResponse.json(
      { error: convError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!conversation || conversation.user_id !== user.id) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const { data: tutorRequest, error: insertError } = await admin
    .from("tutor_requests")
    .insert({ conversation_id, question })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { tutor_request: tutorRequest },
    { status: 201, headers: corsHeaders },
  );
}

export async function GET(request: Request) {
  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { user } = auth;

  const admin = getAdminClient();

  const { data, error } = await admin
    .from("tutor_requests")
    .select(
      "id, conversation_id, question, status, created_at, conversations!inner(user_id)",
    )
    .eq("conversations.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const tutorRequests = data.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    question: row.question,
    status: row.status,
    created_at: row.created_at,
  }));

  return NextResponse.json(
    { tutor_requests: tutorRequests },
    { status: 200, headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
