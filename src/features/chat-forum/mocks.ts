import { CommentCardProps } from "@/components/dao-forum/CommentCard";
import {
  ForumComment,
  ForumCommentPreview,
  ForumPost,
  ForumPostPreview,
} from "./types";

export const mockForumPosts: ForumPost[] = [];

export const mockForumComments: ForumComment[] = [];

export const mockForumPostPreviews: ForumPostPreview[] = [
  {
    id: "forum-post-announcement",
    daoId: "WDCC DAO",
    title: "Week 4 DAO proposal submission deadline",
    excerpt:
      "A reminder that governance proposals must be submitted before Sunday at 11:59 PM NZST.",
    authorName: "DAO Facilitator",
    authorWallet: "0x333B47F13128A1225A434d9f403A3e850B0B48D",
    createdAt: "2026-06-21T07:00:00.000Z",
    createdAtLabel: "2 hours ago",
    commentCount: 4,
    types: ["Announcement"],
    tags: ["Governance"],
    isPinned: true,
  },
  {
    id: "forum-post-proposal",
    daoId: "WDCC DAO",
    title: "Should non-members submit proposals through delegates?",
    excerpt:
      "Opening proposal submission to delegates could increase participation. Feedback on the draft process is welcome.",
    authorName: "Jordan S.",
    authorWallet: "0x9e1e5a823803aFe4Ccf352bdA961570682f47158A",
    createdAt: "2026-06-21T06:00:00.000Z",
    createdAtLabel: "3 hours ago",
    commentCount: 9,
    types: ["Proposal"],
    tags: ["Governance", "Tokenomics"],
    isUnread: true,
  },
  {
    id: "forum-post-question",
    daoId: "WDCC DAO",
    title: "How should we document voting delegation?",
    excerpt:
      "I would like to collect examples and agree on a consistent technical format before the next vote.",
    authorName: "Alex Morgan",
    authorWallet: "0x851C2a9D08d5E45A1cBB42a5e7c3F820621AC912",
    createdAt: "2026-06-20T22:00:00.000Z",
    createdAtLabel: "11 hours ago",
    commentCount: 0,
    types: ["Question"],
    tags: ["Technical"],
  },
];

export const mockForumCommentPreviews: ForumCommentPreview[] = [
  {
    id: "forum-comment-1",
    postId: "forum-post-proposal",
    authorName: "Alice Chen",
    authorWallet: "0xA4B1780e379BC4Fa18e1a026A42dCe738FB105D3",
    body: "A delegate flow makes sense if the final submission clearly identifies both the author and delegate.",
    createdAt: "2026-06-21T07:30:00.000Z",
    createdAtLabel: "90 minutes ago",
    likeCount: 5,
  },
];

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
