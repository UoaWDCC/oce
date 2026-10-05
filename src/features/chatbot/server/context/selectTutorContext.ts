import {
  SITE_GUIDE,
  type SiteGuideEntry,
} from "@/features/chatbot/server/knowledge/siteGuide";
import type { ResolvedPageContext } from "@/features/chatbot/server/knowledge/resolvePageContext";
import type { Message } from "@/llm/types/Message";

const DEFAULT_MAX_NAVIGATION_ENTRIES = 3;
const DEFAULT_MAX_HISTORY_TOKENS = 3200;
const ESTIMATED_CHARS_PER_TOKEN = 4;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "the",
  "to",
  "what",
  "where",
  "which",
  "with",
  "you",
]);

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

type ConversationTurn = {
  index: number;
  messages: Message[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getImportantWords(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = ` ${normalizeText(phrase)} `;

  return normalizedText.includes(normalizedPhrase);
}

function hasNavigationIntent(question: string): boolean {
  const normalizedQuestion = normalizeText(question);

  return NAVIGATION_INTENT_TERMS.some((term) =>
    containsPhrase(normalizedQuestion, term),
  );
}

function scoreNavigationEntry(
  question: string,
  entry: SiteGuideEntry,
  pageContext?: ResolvedPageContext,
): number {
  let score = 0;

  for (const keyword of entry.keywords) {
    if (containsPhrase(question, keyword)) {
      score += keyword.includes(" ") ? 8 : 5;
    }
  }

  if (pageContext?.path === entry.path) {
    score += 4;
  }

  return score;
}

export function selectNavigationEntries(
  question: string,
  pageContext?: ResolvedPageContext,
  maxEntries = DEFAULT_MAX_NAVIGATION_ENTRIES,
): SiteGuideEntry[] {
  if (!hasNavigationIntent(question)) {
    return [];
  }

  return SITE_GUIDE.map((entry) => ({
    entry,
    score: scoreNavigationEntry(question, entry, pageContext),
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxEntries)
    .map(({ entry }) => entry);
}

function groupConversationTurns(messages: Message[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let currentMessages: Message[] = [];

  for (const message of messages) {
    if (message.role === "user" && currentMessages.length > 0) {
      turns.push({ index: turns.length, messages: currentMessages });
      currentMessages = [];
    }

    currentMessages.push(message);
  }

  if (currentMessages.length > 0) {
    turns.push({ index: turns.length, messages: currentMessages });
  }

  return turns;
}

function getTurnText(turn: ConversationTurn): string {
  return turn.messages.map((message) => message.content).join(" ");
}

function scoreConversationTurn(
  turn: ConversationTurn,
  searchTerms: Set<string>,
  distanceFromLatest: number,
): number {
  const turnWords = new Set(getImportantWords(getTurnText(turn)));
  const matchingTerms = [...searchTerms].filter((term) => turnWords.has(term));
  const recencyBonus = Math.max(0, 2 - distanceFromLatest);

  return matchingTerms.length * 3 + recencyBonus;
}

function estimateTurnTokens(turn: ConversationTurn): number {
  const characters = turn.messages.reduce(
    (total, message) => total + message.content.length,
    0,
  );

  return Math.ceil(characters / ESTIMATED_CHARS_PER_TOKEN);
}

export function selectConversationMessages(
  messages: Message[],
  question: string,
  navigationEntries: SiteGuideEntry[] = [],
  maxTokens = DEFAULT_MAX_HISTORY_TOKENS,
): Message[] {
  if (messages.length === 0) {
    return [];
  }

  const turns = groupConversationTurns(messages);
  const latestTurnIndex = turns.length - 1;
  const searchTerms = new Set([
    ...getImportantWords(question),
    ...navigationEntries.flatMap((entry) =>
      entry.keywords.flatMap((keyword) => getImportantWords(keyword)),
    ),
  ]);
  const selectedTurnIndices = new Set<number>([latestTurnIndex]);

  if (latestTurnIndex > 0) {
    selectedTurnIndices.add(latestTurnIndex - 1);
  }

  const relevantOlderTurns = turns
    .slice(0, Math.max(0, latestTurnIndex - 1))
    .map((turn) => ({
      turn,
      score: scoreConversationTurn(
        turn,
        searchTerms,
        latestTurnIndex - turn.index,
      ),
    }))
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score);

  for (const { turn } of relevantOlderTurns) {
    selectedTurnIndices.add(turn.index);
  }

  const selectedMessages: Message[] = [];
  let estimatedTokens = 0;

  const orderedTurns = turns
    .filter((turn) => selectedTurnIndices.has(turn.index))
    .sort((left, right) => {
      if (left.index === latestTurnIndex) return 1;
      if (right.index === latestTurnIndex) return -1;
      return right.index - left.index;
    });

  for (const turn of orderedTurns) {
    if (!selectedTurnIndices.has(turn.index)) {
      continue;
    }

    const turnTokens = estimateTurnTokens(turn);
    const isLatestTurn = turn.index === latestTurnIndex;

    if (!isLatestTurn && estimatedTokens + turnTokens > maxTokens) {
      continue;
    }

    if (isLatestTurn && turnTokens > maxTokens) {
      selectedMessages.push(...turn.messages);
      continue;
    }

    selectedMessages.push(...turn.messages);
    estimatedTokens += turnTokens;
  }

  return selectedMessages.sort(
    (left, right) => messages.indexOf(left) - messages.indexOf(right),
  );
}
