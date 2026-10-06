import { createClient } from "@/utils/supabase/server";
import { after } from "next/server";
import { createLLMProvider } from "@/llm/LLMProviderFactory";
import {
  estimateTokenUsage,
  getMaxDailyTokens,
  getUsageWindow,
} from "@/utils/aiTutorTokenUsage";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type ChatMessageRequestBody = {
  conversation_id?: unknown;
  content?: unknown;
};

// Best-effort coalescing within one worker, without sharing request-bound I/O.
// Expire reservations if the runtime cancels a task before its finally runs.
const titleTasks = new Map<string, { expiresAt: number }>();
const TITLE_TASK_LIFETIME_MS = 30000;

// POST /api/ai-tutor/chat
// Saves a user message to the messages table for a given conversation.
// The role is forced to 'user' server-side so an authenticated caller cannot
// forge assistant messages. Saving assistant replies is handled by #24.
export async function POST(req: Request) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    let body: ChatMessageRequestBody;

    try {
      body = (await req.json()) as ChatMessageRequestBody;
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders },
      );
    }
    const { conversation_id, content } = body;

    if (
      typeof conversation_id !== "string" ||
      conversation_id.trim().length === 0 ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return Response.json(
        { error: "conversation_id and content must be non-empty strings" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { start, end } = getUsageWindow();
    const { data: messages, error: usageError } = await supabase
      .from("messages")
      .select("content, conversations!inner(user_id)")
      .eq("conversations.user_id", user.id)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (usageError) {
      console.error("Failed to load AI tutor token usage:", usageError);
      return Response.json(
        { error: "Failed to load token usage" },
        { status: 500, headers: corsHeaders },
      );
    }

    const existingUsage = estimateTokenUsage(
      (messages ?? []).map((message) => message.content),
    );
    const incomingUsage = estimateTokenUsage([content]);

    if (existingUsage + incomingUsage > getMaxDailyTokens()) {
      return Response.json(
        { error: "exceeded daily token limit" },
        { status: 429, headers: corsHeaders },
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (conversationError || !conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({ conversation_id, role: "user", content })
      .select("*")
      .single();

    if (insertError) {
      return Response.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // OpenNext connects after to Cloudflare's waitUntil. Keep the LLM call off
    // the save response's critical path while retaining its request lifetime.
    const titlePending = !conversation.title;
    if (titlePending) {
      scheduleConversationTitle(supabase, conversation_id, content, user.id);
    }

    return Response.json(
      { message, titlePending },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error("POST /api/ai-tutor/chat failed:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

function scheduleConversationTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  content: string,
  userId: string,
) {
  const now = Date.now();
  for (const [key, task] of titleTasks) {
    if (task.expiresAt <= now) titleTasks.delete(key);
  }
  const key = `${userId}:${conversationId}`;
  if (titleTasks.has(key)) return;
  const task = { expiresAt: now + TITLE_TASK_LIFETIME_MS };
  titleTasks.set(key, task);
  const release = () => {
    if (titleTasks.get(key) === task) titleTasks.delete(key);
  };
  try {
    after(async () => {
      try {
        await generateConversationTitle(
          supabase,
          conversationId,
          content,
          userId,
        );
      } finally {
        release();
      }
    });
  } catch (error) {
    release();
    console.warn("AI tutor title generation failed:", error);
  }
}

async function generateConversationTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  content: string,
  userId: string,
) {
  try {
    const provider = createLLMProvider();
    const title = await provider.complete(
      [
        {
          role: "user",
          content: `Generate one concise, natural conversation title in sentence case.
Keep it under 10 words.
Return only the title, with no quotes, bullet points, or explanation.

User message: ${content.trim()}`,
        },
      ],
      {},
    );
    const cleanedTitle = title
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 80);

    if (cleanedTitle) {
      const { error } = await supabase
        .from("conversations")
        .update({ title: cleanedTitle })
        .eq("id", conversationId)
        .eq("user_id", userId)
        // Both null and an empty string are treated as untitled by the send
        // flow. This predicate is atomic across concurrent worker instances.
        .or('title.is.null,title.eq.""');
      if (error) throw error;
    }
  } catch (error) {
    console.warn("AI tutor title generation failed:", error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
