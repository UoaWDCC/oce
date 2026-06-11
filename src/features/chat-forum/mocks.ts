import { CommentCardProps } from "@/components/dao-forum/CommentCard";
import { ForumComment, ForumPost } from "./types";

export const mockForumPosts: ForumPost[] = [];

export const mockForumComments: ForumComment[] = [];

// Mock data for CommentCard preview
export const mockCommentCardData: CommentCardProps[] = [
  {
    displayName: "Alice Chen",
    timestamp: {
      label: "2 hours ago",
      dateTime: "2026-05-29T10:00:00.000Z",
    },
    body: "This is a great proposal! I think we should move forward with this approach.",
    likeCount: 5,
    isLiked: false,
  },
  {
    displayName: "Bob Martinez",
    timestamp: {
      label: "5 hours ago",
      dateTime: "2026-05-29T07:00:00.000Z",
    },
    body: "I have some concerns about the timeline. Can we discuss this further in the next meeting?",
    likeCount: 3,
    isLiked: true,
  },
  {
    displayName: "Charlie Williams",
    timestamp: {
      label: "1 day ago",
      dateTime: "2026-05-28T12:00:00.000Z",
    },
    body: "Great work on this! I especially like the detailed breakdown of the implementation steps.",
    likeCount: 12,
    isLiked: false,
  },
  {
    displayName: "Diana Lee",
    timestamp: {
      label: "2 days ago",
      dateTime: "2026-05-27T12:00:00.000Z",
    },
    body: "Can someone explain how this integrates with our existing governance structure?",
    likeCount: 0,
    isLiked: false,
  },
];
