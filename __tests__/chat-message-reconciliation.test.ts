import { describe, expect, it } from "vitest";
import type { ChatMessageType } from "@/features/chatbot/types";
import { mergeChatMessages } from "@/features/chatbot/utils/mergeChatMessages";

function persisted(id: string, createdAt: string): ChatMessageType {
  return { id, createdAt, type: "user", message: id };
}

describe("message history ordering", () => {
  it("prepends older IDs when database timestamps tie", () => {
    const timestamp = "2026-10-05T00:00:00.000001+00:00";
    const merged = mergeChatMessages(
      [persisted("b", timestamp)],
      [persisted("a", timestamp)],
      [],
    );
    expect(merged.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("preserves database microsecond ordering before comparing IDs", () => {
    const merged = mergeChatMessages(
      [persisted("a", "2026-10-05T00:00:00.000002+00:00")],
      [persisted("z", "2026-10-05T00:00:00.000001+00:00")],
      [],
    );
    expect(merged.map(({ id }) => id)).toEqual(["z", "a"]);
  });
});
