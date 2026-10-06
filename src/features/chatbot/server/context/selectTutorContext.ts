import {
  SITE_GUIDE,
  type SiteGuideEntry,
} from "@/features/chatbot/server/knowledge/siteGuide";
import type { ResolvedPageContext } from "@/features/chatbot/server/knowledge/resolvePageContext";
import type { Message } from "@/llm/types/Message";

const DEFAULT_MAX_NAVIGATION_ENTRIES = 3;
const DEFAULT_MAX_HISTORY_TOKENS = 3200;
const ESTIMATED_CHARS_PER_TOKEN = 4;
const HISTORY_OMISSION_MARKER =
  "\n[... middle omitted due to history budget ...]\n";

const NAVIGATION_INTENT_TERMS = [
  "access",
  "button",
  "click",
  "find",
  "here",
  "how do i",
  "navigate",
  "open",
  "page",
  "select",
  "sign in",
  "tab",
  "use",
  "where",
];

// These identify platform features without an additional navigation verb.
// Generic guide keywords such as "learning", "governance", "reply", and
// "more help" still require navigation intent.
const PLATFORM_FEATURE_KEYWORDS = new Set([
  "ai tutor",
  "human tutor",
  "real tutor",
  "ask a tutor",
  "tutor request",
  "course portal",
  "fullscreen chat",
  "conversation list",
  "chat history",
  "new conversation",
  "search conversations",
  "previous conversation",
  "end conversation",
  "remove conversation",
  "copy response",
  "copy answer",
  "favourite",
  "favorite",
  "saved message",
  "bookmarked answer",
  "starred message",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsPhrase(text: string, phrase: string): boolean {
  return ` ${normalizeText(text)} `.includes(` ${normalizeText(phrase)} `);
}

function scoreNavigationEntry(
  question: string,
  entry: SiteGuideEntry,
  hasNavigationIntent: boolean,
  pageContext?: Partial<ResolvedPageContext>,
): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    if (
      (hasNavigationIntent || PLATFORM_FEATURE_KEYWORDS.has(keyword)) &&
      containsPhrase(question, keyword)
    ) {
      score += keyword.includes(" ") ? 8 : 5;
    }
  }

  // Allow a qualifier between the known action and its object, as in
  // "copy an AI Tutor response", without matching "copy" alone.
  if (
    entry.id === "ai-tutor-response-actions" &&
    /\bcopy (?:an? |the |my |your )?(?:ai tutor )?(?:response|answer)\b/.test(
      normalizeText(question),
    ) &&
    !containsPhrase(question, "copy response") &&
    !containsPhrase(question, "copy answer")
  ) {
    score += 8;
  }

  if (
    hasNavigationIntent &&
    pageContext?.path &&
    entry.path &&
    pageContext.path === entry.path
  ) {
    score += 4;
  }
  return score;
}

export function selectNavigationEntries(
  question: string,
  pageContext?: Partial<ResolvedPageContext>,
  maxEntries = DEFAULT_MAX_NAVIGATION_ENTRIES,
): SiteGuideEntry[] {
  const hasNavigationIntent = NAVIGATION_INTENT_TERMS.some((term) =>
    containsPhrase(question, term),
  );
  return SITE_GUIDE.map((entry) => ({
    entry,
    score: scoreNavigationEntry(
      question,
      entry,
      hasNavigationIntent,
      pageContext,
    ),
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxEntries)
    .map(({ entry }) => entry);
}

function groupConversationTurns(messages: Message[]): Message[][] {
  const turns: Message[][] = [];
  for (const message of messages) {
    if (message.role === "user" || turns.length === 0) turns.push([]);
    turns[turns.length - 1].push(message);
  }
  return turns;
}

function estimateTurnTokens(turn: Message[]): number {
  return Math.ceil(
    turn.reduce((total, message) => total + message.content.length, 0) /
      ESTIMATED_CHARS_PER_TOKEN,
  );
}

function excerptTurn(turn: Message[], maxCharacters: number): Message[] {
  // Reserve a labelled omission plus some surrounding text for every message.
  // If even this cannot fit, there is no room for a useful exchange excerpt.
  if (maxCharacters < turn.length * (HISTORY_OMISSION_MARKER.length + 2)) {
    return [];
  }
  const fairShare = Math.floor(maxCharacters / turn.length);
  const allocations = turn.map((message) =>
    Math.min(message.content.length, fairShare),
  );
  let spareCharacters =
    maxCharacters - allocations.reduce((total, value) => total + value, 0);

  // Short questions leave their unused share available for the answer.
  for (let index = 0; index < turn.length; index++) {
    const extra = Math.min(
      spareCharacters,
      turn[index].content.length - allocations[index],
    );
    allocations[index] += extra;
    spareCharacters -= extra;
  }
  return turn.map((message, index) => {
    const allocation = allocations[index];
    if (message.content.length <= allocation) return message;
    const surroundingCharacters = allocation - HISTORY_OMISSION_MARKER.length;
    const head = Math.ceil(surroundingCharacters / 2);
    const tail = Math.floor(surroundingCharacters / 2);
    return {
      ...message,
      content:
        message.content.slice(0, head) +
        HISTORY_OMISSION_MARKER +
        message.content.slice(-tail),
    };
  });
}

/**
 * Keep a contiguous recent history, reserving the latest turn first. Older
 * requirements cannot be retained indefinitely within a bounded history.
 * In stream requests the latest turn is the current user request. It is never
 * duplicated or truncated. The budget estimates content at four chars/token,
 * including omission markers, and excludes the separate system instruction.
 * Only an oversized latest turn may exceed the estimated token budget; it is
 * kept unchanged and sent alone. If the immediately preceding exchange cannot
 * fit, retain labelled head/tail excerpts of each message when space permits,
 * then stop. Other older exchanges are retained whole or omitted at the first
 * budget boundary; never skip a gap to pick an isolated older exchange. When
 * the latest turn leaves too little space for a labelled, useful excerpt,
 * only that turn remains. Excerpts cannot guarantee every earlier constraint.
 */
export function selectConversationMessages(
  messages: Message[],
  maxTokens = DEFAULT_MAX_HISTORY_TOKENS,
): Message[] {
  const turns = groupConversationTurns(messages);
  const latestTurn = turns.at(-1);
  if (!latestTurn) return [];
  const selectedMessages = [...latestTurn];
  let remainingTokens = maxTokens - estimateTurnTokens(latestTurn);
  for (let index = turns.length - 2; index >= 0; index--) {
    const turn = turns[index];
    const turnTokens = estimateTurnTokens(turn);
    if (turnTokens > remainingTokens) {
      if (index === turns.length - 2) {
        selectedMessages.unshift(
          ...excerptTurn(
            turn,
            Math.max(
              0,
              Math.floor(remainingTokens * ESTIMATED_CHARS_PER_TOKEN),
            ),
          ),
        );
      }
      break;
    }
    selectedMessages.unshift(...turn);
    remainingTokens -= turnTokens;
  }
  return selectedMessages;
}
