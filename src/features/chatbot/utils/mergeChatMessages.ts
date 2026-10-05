import type { ChatMessageType } from "../types";

export interface LocalAssistantTurn {
  question: ChatMessageType;
  response: ChatMessageType;
}

function comparePersistedMessages(a: ChatMessageType, b: ChatMessageType) {
  const first = Date.parse(a.createdAt ?? "");
  const second = Date.parse(b.createdAt ?? "");
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 0;
  const difference = first - second;
  if (difference) return difference;
  // PostgreSQL timestamps can include microseconds that Date.parse truncates.
  const fraction = (value: string) =>
    (value.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0");
  const preciseDifference = fraction(a.createdAt!).localeCompare(
    fraction(b.createdAt!),
  );
  // Match the database's created_at/id ordering, including timestamp ties.
  return preciseDifference || (a.id && b.id ? a.id.localeCompare(b.id) : 0);
}

// Database IDs reconcile persisted rows. Client IDs identify local replies;
// the saved question anchors them even outside the newest history page.
export function mergeChatMessages(
  current: ChatMessageType[],
  incoming: ChatMessageType[],
  localTurns: LocalAssistantTurn[],
): ChatMessageType[] {
  const byId = new Map<string, ChatMessageType>();
  for (const message of [...current, ...incoming]) {
    if (message.id) {
      byId.set(message.id, { ...byId.get(message.id), ...message });
    }
  }
  const merged = [...byId.values()];
  const insertChronologically = (message: ChatMessageType) => {
    const index = merged.findIndex(
      (other) => comparePersistedMessages(message, other) < 0,
    );
    merged.splice(index < 0 ? merged.length : index, 0, message);
  };
  merged.sort(comparePersistedMessages);

  for (const { question, response } of localTurns) {
    // Restore a blank live reply only when this accepted history page contains
    // its saved question; an unrelated reset page must not revive it.
    if (
      response.responseStatus === "streaming" &&
      !response.message.trim() &&
      !incoming.some(({ id }) => id === question.id)
    ) {
      continue;
    }
    if (!merged.some(({ id }) => id === question.id)) {
      insertChronologically(question);
    }
    const authoritative = incoming.find(
      ({ id }) => response.id !== undefined && id === response.id,
    );
    const reply = authoritative
      ? { ...response, ...authoritative, clientId: response.clientId }
      : response;
    // Remove the same local or persisted identity before placing its reply.
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      if (
        (response.clientId && merged[index].clientId === response.clientId) ||
        (response.id && merged[index].id === response.id)
      ) {
        merged.splice(index, 1);
      }
    }
    const questionIndex = merged.findIndex(({ id }) => id === question.id);
    merged.splice(questionIndex + 1, 0, reply);
  }
  return merged;
}
