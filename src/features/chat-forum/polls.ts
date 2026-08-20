import type { CreatePollFields } from "@app-types/dao-forum";

export const POLL_LIMITS = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  QUESTION: 200,
  OPTION: 80,
} as const;

export function validateAndNormalizePoll(poll: CreatePollFields | undefined): {
  poll?: CreatePollFields;
  error?: string;
} {
  if (!poll) return {};

  if (typeof poll.question !== "string" || !Array.isArray(poll.options)) {
    return { error: "Invalid poll" };
  }

  const question = poll.question.trim();
  const options = poll.options.map((option) =>
    typeof option === "string" ? option.trim() : "",
  );

  if (!question || question.length > POLL_LIMITS.QUESTION) {
    return {
      error: `Poll question must be between 1 and ${POLL_LIMITS.QUESTION} characters`,
    };
  }
  if (
    options.length < POLL_LIMITS.MIN_OPTIONS ||
    options.length > POLL_LIMITS.MAX_OPTIONS ||
    options.some((option) => !option || option.length > POLL_LIMITS.OPTION)
  ) {
    return {
      error: `Polls require ${POLL_LIMITS.MIN_OPTIONS}-${POLL_LIMITS.MAX_OPTIONS} options of ${POLL_LIMITS.OPTION} characters or fewer`,
    };
  }
  if (
    new Set(options.map((option) => option.toLocaleLowerCase())).size !==
    options.length
  ) {
    return { error: "Poll options must be unique" };
  }
  if (typeof poll.allow_multiple !== "boolean") {
    return { error: "Invalid poll voting mode" };
  }

  return {
    poll: {
      question,
      options,
      allow_multiple: poll.allow_multiple,
    },
  };
}
