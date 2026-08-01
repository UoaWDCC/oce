import { NextRequest, NextResponse } from "next/server";
import { buildAiTutorInstruction } from "@/features/chatbot/server/prompts/buildAiTutorInstruction";
import { createLLMProvider } from "@/llm/LLMProviderFactory";
import type { LLMConfig } from "@/llm/types/LLMConfig";
import type { Message } from "@/llm/types/Message";
import { authenticateRequest, getAdminClient } from "@/utils/authHelper";
import {
  estimateTokenUsage,
  getMaxDailyTokens,
  getUsageWindow,
} from "@/utils/aiTutorTokenUsage";

interface ChatRequestBody {
  messages?: Message[];
  config?: LLMConfig;
  conversation_id?: unknown;
}

// Streams the LLM reply, then saves it as an assistant message once the
// stream completes. Partial replies from failed or cancelled streams are
// never saved.
export async function POST(req: NextRequest) {
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    req.headers.get("Authorization") === "dev";

  let userId: string | null = null;

  if (!isDevBypass) {
    const auth = await authenticateRequest(req);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = auth.uid;
  }

  const body = (await req.json()) as ChatRequestBody;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "Messages array is required" },
      { status: 400 },
    );
  }

  const conversationId =
    typeof body.conversation_id === "string" &&
    body.conversation_id.trim() !== ""
      ? body.conversation_id
      : null;

  if (userId) {
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 },
      );
    }

    const { data: conversation } = await getAdminClient()
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const { start, end } = getUsageWindow();
    const { data: persistedMessages, error: usageError } =
      await getAdminClient()
        .from("messages")
        .select("content, conversations!inner(user_id)")
        .eq("conversations.user_id", userId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

    if (usageError) {
      console.error("Failed to load AI tutor token usage:", usageError);
      return NextResponse.json(
        { error: "Failed to load token usage" },
        { status: 500 },
      );
    }

    const tokenUsage = estimateTokenUsage(
      (persistedMessages ?? []).map((message) => message.content),
    );

    if (tokenUsage > getMaxDailyTokens()) {
      return NextResponse.json(
        { error: "exceeded daily token limit" },
        { status: 429 },
      );
    }
  }

  const provider = createLLMProvider();
  const systemInstruction = buildAiTutorInstruction();
  const stream = provider.stream(body.messages, {
    ...body.config,
    systemInstruction,
  });
  const iterator = stream[Symbol.asyncIterator]();

  let firstChunk: IteratorResult<string>;

  try {
    firstChunk = await iterator.next();
  } catch {
    return NextResponse.json({ error: "LLM provider error" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  let clientCancelled = false;

  req.signal.addEventListener("abort", () => {
    clientCancelled = true;
    iterator.return?.();
  });

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullResponse = "";

      // Text chunks are JSON-encoded so newlines/blank lines survive SSE framing
      // (a raw "\n\n" in a chunk would otherwise read as an event boundary). The
      // [MESSAGE_ID]/[DONE] sentinels stay bare tokens, distinct from quoted JSON.
      try {
        if (!firstChunk.done) {
          fullResponse += firstChunk.value;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(firstChunk.value)}\n\n`),
          );
        }

        for (;;) {
          const chunk = await iterator.next();

          if (chunk.done) {
            break;
          }

          fullResponse += chunk.value;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk.value)}\n\n`),
          );
        }

        // Reached after a clean finish, but a client cancel also ends the
        // loop cleanly, so the flag is needed to avoid saving partial replies.
        if (
          !clientCancelled &&
          userId &&
          conversationId &&
          fullResponse.trim() !== ""
        ) {
          const { data: saved, error: insertError } = await getAdminClient()
            .from("messages")
            .insert({
              conversation_id: conversationId,
              role: "assistant",
              content: fullResponse,
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Failed to save assistant message:", insertError);
          } else if (saved) {
            controller.enqueue(
              encoder.encode(`data: [MESSAGE_ID]${saved.id}\n\n`),
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        // A client that stopped reading (e.g. user switched conversations)
        // surfaces here as a failed enqueue / aborted iterator — expected
        // cancellation, not a provider failure. Close quietly, not a noisy 500.
        if (clientCancelled || req.signal.aborted) {
          try {
            controller.close();
          } catch {
            // Controller may already be closed/errored; nothing more to do.
          }
          return;
        }

        // A genuine provider failure while the client is still connected — let
        // it propagate so the active conversation shows the error.
        console.error("AI tutor stream failed:", error);
        controller.error(new Error("LLM provider error"));
      }
    },
    cancel() {
      clientCancelled = true;
      iterator.return?.();
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
