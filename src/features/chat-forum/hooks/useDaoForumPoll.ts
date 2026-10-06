import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ForumPoll } from "@app-types/dao-forum";
import { getForumPoll, submitForumPollVote } from "../services";
import { forumKeys } from "../queryKeys";
import { toForumAsyncState } from "../lib/asyncState";

export function useDaoForumPoll(
  daoGroupId: string,
  postId: string,
  token?: string,
  currentUserId?: string | null,
) {
  const queryClient = useQueryClient();
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<Error | null>(null);
  const queryKey = forumKeys.poll(daoGroupId, postId, currentUserId);
  const isEnabled = Boolean(token);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getForumPoll(daoGroupId, postId, token, signal),
    enabled: isEnabled,
  });

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

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
        queryClient.setQueryData<ForumPoll>(queryKey, updated);
        setVoteError(null);
      } catch (caught) {
        const error =
          caught instanceof Error ? caught : new Error("Failed to submit vote");
        setVoteError(error);
        throw error;
      } finally {
        setIsVoting(false);
      }
    },
    [daoGroupId, postId, token, queryClient, queryKey],
  );

  const state = toForumAsyncState(query, isEnabled, () => void refetch());

  return {
    poll: query.data ?? null,
    ...state,
    // A failed vote is surfaced alongside fetch failures, but it never blocks
    // the poll: the options the user was looking at are still on screen.
    error: state.error ?? voteError,
    isVoting,
    vote,
    refetch,
  };
}
