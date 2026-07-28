import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { authenticateRequest } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "");
  const user = await authenticateRequest(req);

  const supabase = await createClient(accessToken);

  if (!user) {
    return Response.json(
      { error: "Invalid auth token" },
      { status: 401, headers: corsHeaders },
    );
  }

  const now = new Date();
  const range = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversations!inner(user_id), content, created_at")
    .eq("conversations.user_id", user.uid)
    .gte("created_at", range.toISOString())
    .lte("created_at", now.toISOString());

  const tokenCount =
    messages!.reduce((total, message) => total + message.content.length, 0) / 4;

  const message = {
    availableTokens: 100000 - tokenCount,
    usedTokens: tokenCount,
    totalTokens: 100000,
    oldestMessage: messages ? messages[0].created_at : null,
  };

  return new NextResponse(JSON.stringify(message), {
    status: 200,
    headers: corsHeaders,
  });
}
