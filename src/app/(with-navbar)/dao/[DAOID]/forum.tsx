"use client";
import { useState, useEffect } from "react";
import { ForumPanel } from "@/features/chat-forum";
import { DAO } from "./types";
import { createClient } from "@/utils/supabase/client";
import { useDaoForumPosts } from "@/features/chat-forum/hooks/useDaoForumPosts";
import { useDaoForumComments } from "@/features/chat-forum/hooks/useDaoForumComments";
import { useCreateDaoForumPost } from "@/features/chat-forum/hooks/useCreateDaoForumPost";
import { useCreateDaoForumComment } from "@/features/chat-forum/hooks/useCreateDaoForumComment";
import {
  submitForumComment,
  submitForumPost,
} from "@/features/chat-forum/submitHandlers";
import type {
  CommentSubmitPayload,
  PostSubmitPayload,
} from "@app-types/dao-forum";

type DaoForumProps = {
  dao: DAO;
};

export default function DaoForum({ dao }: DaoForumProps) {
  const supabase = createClient();
  const [token, setToken] = useState<string | undefined>(undefined);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // The DAO forum API is keyed by the dao_groups UUID, but this route only has
  // the on-chain DAOID (contract address). Until the DAOID -> dao_groups.id
  // resolver lands (skrz_0's data-fetching work), we pass DAOID directly.
  // TODO: swap this single line for the resolved dao_groups.id UUID.
  const daoGroupId = dao.DAOID;

  useEffect(() => {
    async function fetchToken() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      setToken(accessToken);
    }
    fetchToken();
  }, []);

  const {
    posts,
    isLoading,
    error,
    refetch: refetchPosts,
  } = useDaoForumPosts(daoGroupId, token);
  const { comments, refetch: refetchComments } = useDaoForumComments(
    daoGroupId,
    selectedPostId,
    token,
  );

  const { createPost, error: createPostError } = useCreateDaoForumPost(
    daoGroupId,
    token,
  );
  const { createComment, error: createCommentError } = useCreateDaoForumComment(
    daoGroupId,
    selectedPostId,
    token,
  );

  const handleSubmitPost = async (
    payload: PostSubmitPayload,
  ): Promise<void> => {
    await submitForumPost({ createPost, refetchPosts }, payload);
  };

  const handleSubmitComment = async (
    _postId: string,
    payload: CommentSubmitPayload,
  ): Promise<void> => {
    await submitForumComment({ createComment, refetchComments }, payload);
  };

  const submissionError =
    createPostError?.message ?? createCommentError?.message;

  return (
    <ForumPanel
      comments={comments}
      daoId={dao.DAOID}
      daoName={dao.Name}
      posts={posts}
      isLoading={isLoading}
      error={error?.message ?? submissionError}
      onSelectPost={setSelectedPostId}
      onSubmitPost={handleSubmitPost}
      onSubmitComment={handleSubmitComment}
    />
  );
}
