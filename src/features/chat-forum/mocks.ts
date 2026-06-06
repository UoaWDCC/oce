import { CommentCardProps, ForumComment, ForumPost } from "./types";

export const mockForumPosts: ForumPost[] = [];

export const mockForumComments: ForumComment[] = [];

// Mock data for CommentCard preview
export const mockCommentCardData: CommentCardProps[] = [
  {
    username: "Alice Chen",
    userInitials: "AC",
    timestamp: "2 hours ago",
    body: "This is a great proposal! I think we should move forward with this approach.",
    likeCount: 5,
    isLiked: false,
  },
  {
    username: "Bob Martinez",
    timestamp: "5 hours ago",
    body: "I have some concerns about the timeline. Can we discuss this further in the next meeting?",
    likeCount: 3,
    isLiked: true,
  },
  {
    username: "Charlie Williams",
    userInitials: "CW",
    timestamp: "1 day ago",
    body: "Great work on this! I especially like the detailed breakdown of the implementation steps.",
    likeCount: 12,
    isLiked: false,
  },
  {
    username: "Diana Lee",
    timestamp: "2 days ago",
    body: "Can someone explain how this integrates with our existing governance structure?",
    likeCount: 0,
    isLiked: false,
  },
];
