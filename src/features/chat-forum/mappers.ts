import { Timestamp } from "@/components/common";
import { ForumPost, ForumComment, AuthorProfile } from "./types";
import { PostCardProps } from "@/components/dao-forum/Post";
import { CommentCardProps } from "@/components/dao-forum/CommentCard";

function toTimeStamp(isoString: string): Timestamp {
  return {
    label: new Date(isoString).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    dateTime: isoString,
  };
}

export function mapPostToPostCardProps(
  post: ForumPost,
  authorProfile: AuthorProfile | null,
  commentCount: number,
): PostCardProps {
  return {
    daoId: post.daoId,
    title: post.title,
    displayName: authorProfile?.displayName ?? "Anonymous",
    walletAddress: authorProfile?.walletAddress ?? post.authorId,
    profileImageUrl: authorProfile?.profileImageUrl ?? null,
    createdAt: toTimeStamp(post.createdAt),
    commentCount: commentCount,
  };
}

export function mapCommentToCommentCardProps(
  comment: ForumComment,
  authorProfile: AuthorProfile | null,
): CommentCardProps {
  return {
    displayName: authorProfile?.displayName ?? "Anonymous",
    walletAddress: authorProfile?.walletAddress ?? comment.authorId,
    profileImageUrl: authorProfile?.profileImageUrl ?? null,
    avatarColor: authorProfile?.avatarColor ?? undefined,
    badges: authorProfile?.badges ?? undefined,
    timestamp: toTimeStamp(comment.createdAt),
    body: comment.body ?? "",
  };
}
