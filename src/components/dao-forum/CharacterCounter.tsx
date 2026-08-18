type CharacterCounterProps = {
  count: number;
  limit: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
};

export function CharacterCounter({
  count,
  limit,
  isOverLimit,
  isNearLimit,
}: CharacterCounterProps) {
  return (
    <span
      className={
        isOverLimit
          ? "text-red-600 font-semibold"
          : isNearLimit
            ? "text-amber-600 font-semibold"
            : "text-slate-400"
      }
    >
      {count}/{limit}
    </span>
  );
}
