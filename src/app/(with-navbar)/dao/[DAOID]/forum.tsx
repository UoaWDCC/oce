"use client";
import { useState, useEffect } from "react";
import { ForumPanel } from "@/features/chat-forum";
import { DAO } from "./types";
import { createClient } from "@/utils/supabase/client";
import { useDaoForumPosts } from "@/features/chat-forum/hooks/useDaoForumPosts";
import { useDaoForumComments } from "@/features/chat-forum/hooks/useDaoForumComments";

type DaoForumProps = {
  dao: DAO;
};

export default function DaoForum({ dao }: DaoForumProps) {
  const supabase = createClient();
  const [token, setToken] = useState<string | undefined>(undefined);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      setToken(accessToken);
    }
    fetchToken();
  }, []);
  const { posts, isLoading, error } = useDaoForumPosts(dao.DAOID, token);
  const { comments } = useDaoForumComments(dao.DAOID, selectedPostId, token);

  return (
    <ForumPanel
      comments={comments}
      daoId={dao.DAOID}
      daoName={dao.Name}
      posts={posts}
      isLoading={isLoading}
      error={error?.message}
      onSelectPost={setSelectedPostId}
    />
  );
}
