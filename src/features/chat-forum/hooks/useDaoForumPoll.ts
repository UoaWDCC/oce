import { useCallback, useEffect, useRef, useState } from "react";
import type { ForumPoll } from "@app-types/dao-forum";
import { getForumPoll, submitForumPollVote } from "../services";

export function useDaoForumPoll(
  daoGroupId: string,
  postId: string,
  token?: string,
) {
  const [poll, setPoll] = useState<ForumPoll | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    abortRef.current?.abort();
    if (!token) {
      setPoll(null);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      setPoll(await getForumPoll(daoGroupId, postId, token, controller.signal));
      setError(null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      setError(
        caught instanceof Error ? caught : new Error("Failed to load poll"),
      );
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [daoGroupId, postId, token]);

  useEffect(() => {
    void refetch();
    return () => abortRef.current?.abort();
  }, [refetch]);

  const vote = useCallback(
    async (optionIds: string[]) => {
      if (!token) throw new Error("Sign in to vote");
      setIsVoting(true);
      try {
        const updated = await submitForumPollVote(
          daoGroupId,
          postId,
          optionIds,
          token,
        );
        setPoll(updated);
        setError(null);
      } catch (caught) {
        const voteError =
          caught instanceof Error ? caught : new Error("Failed to submit vote");
        setError(voteError);
        throw voteError;
      } finally {
        setIsVoting(false);
      }
    },
    [daoGroupId, postId, token],
  );

  return { poll, isLoading, isVoting, error, vote, refetch };
}
