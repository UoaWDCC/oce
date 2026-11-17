"use client";
import { useEffect, useState } from "react";
import { useDaoForumPoll } from "../hooks/useDaoForumPoll";

export default function ForumPollCard({
  daoGroupId,
  postId,
  token,
  currentUserId,
}: {
  daoGroupId: string;
  postId: string;
  token?: string;
  currentUserId?: string | null;
}) {
  const { poll, isInitialLoading, isRefreshing, isVoting, error, retry, vote } =
    useDaoForumPoll(daoGroupId, postId, token, currentUserId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(
      poll?.options
        .filter((option) => option.isSelected)
        .map((option) => option.id) ?? [],
    );
  }, [poll]);

  /**
   * Polls are optional and most posts do not have one, but nothing in the post
   * list says which do — the poll is only discoverable by fetching it. A
   * skeleton here therefore reserved a block of space on *every* thread and
   * then collapsed it again for the majority that turned out to have no poll,
   * shunting the footer, the replies heading and the whole comment thread
   * upwards as it went.
   *
   * Reserving no space is the honest option while we don't know: a post with a
   * poll grows once when it arrives, and a post without one never moves at all.
   * Reserving space correctly needs the post list to tell us whether a poll
   * exists, which is a backend change.
   */
  if (isInitialLoading) return null;
  if (!poll) {
    return error ? (
      <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-600">
        <span>{error.message}</span>
        <button
          className="rounded-full border border-red-300 px-3 py-1 font-bold transition hover:bg-red-50 disabled:opacity-60"
          disabled={isRefreshing}
          onClick={retry}
          type="button"
        >
          {isRefreshing ? "Retrying…" : "Retry"}
        </button>
      </p>
    ) : null;
  }

  const hasExistingVote = poll.options.some((option) => option.isSelected);
  const toggleOption = (optionId: string) => {
    if (!poll.allowMultiple) {
      setSelectedIds([optionId]);
      return;
    }
    setSelectedIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  return (
    <section
      className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-5"
      aria-labelledby={`poll-${poll.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id={`poll-${poll.id}`}
            className="text-lg font-bold text-slate-900"
          >
            {poll.question}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {poll.allowMultiple
              ? "Select one or more options"
              : "Select one option"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {poll.options.map((option) => {
          const percentage =
            poll.totalVoters > 0
              ? Math.round((option.voteCount / poll.totalVoters) * 100)
              : 0;
          return (
            <label
              key={option.id}
              className="block cursor-pointer rounded-xl border border-violet-100 bg-white p-3"
            >
              <span className="flex items-center gap-3">
                <input
                  type={poll.allowMultiple ? "checkbox" : "radio"}
                  name={`poll-${poll.id}`}
                  checked={selectedIds.includes(option.id)}
                  disabled={isVoting}
                  onChange={() => toggleOption(option.id)}
                  className="h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                  {option.label}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {option.voteCount} · {percentage}%
                </span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-violet-100">
                <span
                  className="block h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {poll.totalVoters} {poll.totalVoters === 1 ? "voter" : "voters"}
        </p>
        <button
          type="button"
          disabled={selectedIds.length === 0 || isVoting}
          onClick={() => void vote(selectedIds).catch(() => undefined)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVoting ? "Saving…" : hasExistingVote ? "Update vote" : "Vote"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </section>
  );
}
