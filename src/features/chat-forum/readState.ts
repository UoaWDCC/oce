export function isPostUnread(
  lastViewedAt: string | null | undefined,
  latestCommentCreatedAt: string | null | undefined,
): boolean {
  if (!lastViewedAt) return true;
  if (!latestCommentCreatedAt) return false;

  const lastViewedTime = Date.parse(lastViewedAt);
  const latestCommentTime = Date.parse(latestCommentCreatedAt);

  // Treat an invalid persisted view conservatively as never viewed. Invalid
  // comment timestamps are ignored because they cannot establish new activity.
  if (Number.isNaN(lastViewedTime)) return true;
  if (Number.isNaN(latestCommentTime)) return false;

  return latestCommentTime > lastViewedTime;
}
