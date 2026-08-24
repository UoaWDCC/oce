import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ForumPoll } from "@app-types/dao-forum";
import { getForumPoll, submitForumPollVote } from "../services";
import { forumKeys } from "../queryKeys";

export function useDaoForumPoll(
  daoGroupId: string,
  postId: string,
  token?: string,
) {
  const queryClient = useQueryClient();
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<Error | null>(null);
  const queryKey = forumKeys.poll(daoGroupId, postId);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getForumPoll(daoGroupId, postId, token, signal),
    enabled: Boolean(token),
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

  return {
    poll: query.data ?? null,
    isLoading: query.isPending && query.isFetching,
    isVoting,
    error: (query.error as Error | null) ?? voteError,
    vote,
    refetch,
  };
}
