import { NextRequest, NextResponse } from "next/server";
import { createLLMProvider } from "@/llm/LLMProviderFactory";
import type { LLMConfig } from "@/llm/types/LLMConfig";
import type { Message } from "@/llm/types/Message";
import { authenticateRequest } from "@/utils/authHelper";

interface ChatRequestBody {
  messages?: Message[];
  config?: LLMConfig;
}

export async function POST(req: NextRequest) {
  if (
    !(
      process.env.NODE_ENV === "development" &&
      req.headers.get("Authorization") === "dev"
    )
  ) {
    const auth = await authenticateRequest(req);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json()) as ChatRequestBody;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "Messages array is required" },
      { status: 400 },
    );
  }

  const provider = createLLMProvider();
  const stream = provider.stream(body.messages, body.config ?? {});
  const iterator = stream[Symbol.asyncIterator]();

  let firstChunk: IteratorResult<string>;

  try {
    firstChunk = await iterator.next();
  } catch {
    return NextResponse.json(
      { error: "LLM provider error" },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!firstChunk.done) {
          controller.enqueue(encoder.encode(`data: ${firstChunk.value}\n\n`));
        }

        for (;;) {
          const chunk = await iterator.next();

          if (chunk.done) {
            break;
          }

          controller.enqueue(encoder.encode(`data: ${chunk.value}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        controller.error(new Error("LLM provider error"));
      }
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
