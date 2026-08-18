export const CONTENT_LIMITS = {
  POST_TITLE: 50,
  POST_BODY: 350,
  COMMENT_BODY: 350,
} as const;

export type ContentLimitKey = keyof typeof CONTENT_LIMITS;
