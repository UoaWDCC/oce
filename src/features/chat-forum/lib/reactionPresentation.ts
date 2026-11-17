import type { ReactionType } from "../contracts";
import type { ForumThreadSort, ForumReactionFilterType } from "../types";

export const SORT_OPTIONS: Array<{ value: ForumThreadSort; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_reacted", label: "Most reacted" },
];

export const REACTIONS: Array<{
  type: ReactionType;
  label: string;
  emoji: string;
}> = [
  { type: "heart", label: "Heart", emoji: "❤️" },
  { type: "thumbs_up", label: "Thumbs up", emoji: "👍" },
  { type: "fire", label: "Fire", emoji: "🔥" },
  { type: "thumbs_down", label: "Thumbs down", emoji: "👎" },
];

export const REACTION_FILTER_OPTIONS: Array<{
  value: ForumReactionFilterType;
  label: string;
  emoji?: string;
}> = [
  { value: "all", label: "All reactions" },
  ...REACTIONS.map(({ type, label, emoji }) => ({ value: type, label, emoji })),
];
