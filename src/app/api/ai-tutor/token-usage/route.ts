import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authenticateRequest } from "@/utils/authHelper";
import {
  estimateTokenUsage,
  getMaxDailyTokens,
  getUsageWindow,
} from "@/utils/aiTutorTokenUsage";

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

  const { start, end } = getUsageWindow();
  const { data: messages, error: usageError } = await supabase
    .from("messages")
    .select("id, conversations!inner(user_id), content, created_at")
    .eq("conversations.user_id", user.uid)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (usageError) {
    console.error("Failed to load AI tutor token usage:", usageError);
    return NextResponse.json(
      { error: "Failed to load token usage" },
      { status: 500, headers: corsHeaders },
    );
  }

  const safeMessages = messages ?? [];
  const tokenCount = estimateTokenUsage(
    safeMessages.map((message) => message.content),
  );
  const maxDailyTokens = getMaxDailyTokens();

  const message = {
    availableTokens: Math.max(0, maxDailyTokens - tokenCount),
    usedTokens: tokenCount,
    totalTokens: maxDailyTokens,
    oldestMessage: safeMessages[0]?.created_at ?? null,
  };

  return NextResponse.json(message, { status: 200, headers: corsHeaders });
}
