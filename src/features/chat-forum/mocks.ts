import { CommentCardProps } from "@/components/dao-forum/CommentCard";
import type {
  ForumCommentPreview,
  ForumPostPreview,
} from "@app-types/dao-forum";
import type { ForumThreadComment, ForumThreadPost } from "./types";

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
    viewCount: 42,
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
    viewCount: 28,
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
    viewCount: 15,
    types: ["Question"],
    tags: ["Technical"],
  },
];

export const mockForumCommentPreviews: ForumCommentPreview[] = [
  {
    id: "forum-comment-1",
    postId: "forum-post-proposal",
    parentCommentId: null,
    authorName: "Alice Chen",
    authorWallet: "0xA4B1780e379BC4Fa18e1a026A42dCe738FB105D3",
    body: "A delegate flow makes sense if the final submission clearly identifies both the author and delegate.",
    createdAt: "2026-06-21T07:30:00.000Z",
    createdAtLabel: "90 minutes ago",
    likeCount: 5,
  },
];

export const mockForumThreadPost: ForumThreadPost = {
  id: "forum-thread-proposal",
  title:
    "Should we allow non-members to submit proposals via a delegate address?",
  body: [
    "I've been looking at the governance contract and I'm confused about how quorum is calculated. The docs say we need `quorumPercent` of total shares to vote, but I'm not sure if this includes **loot tokens** or just **voting shares**.",
    "Here's the relevant snippet I found in the contract:",
    "```solidity\nfunction hasQuorum(uint256 proposalId) public view returns (bool) {\n  Proposal storage prop = proposals[proposalId];\n  uint256 totalVotes = prop.yesVotes + prop.noVotes;\n  return totalVotes * 100 / totalShares >= quorumPercent;\n}\n```",
    "Does anyone know if this is the correct implementation, or should the denominator be `totalShares + totalLoot`? The Moloch v3 spec is a bit ambiguous on this point.",
  ].join("\n\n"),
  postType: "Proposal",
  tags: ["Governance", "Tokenomics"],
  author: {
    name: "Jordan S.",
    avatarColor: "#7c3aed",
  },
  createdAt: "2026-07-22T04:24:00.000Z",
  createdAtLabel: "3 hours ago",
  statusLabel: "Voting Open",
  viewCount: 28,
};

export const mockForumThreadComments: ForumThreadComment[] = [
  {
    id: "thread-comment-1",
    body: [
      "Great question! In Moloch v3, **quorum is calculated only against voting shares** — loot tokens are non-voting by design.",
      "Check out `MolochSummoner.sol` in Week 3 resources for the full spec.",
    ].join("\n\n"),
    author: {
      name: "Dr. Rivera",
      avatarColor: "#7c3aed",
      badges: ["Staff"],
      isEndorsed: true,
    },
    createdAt: "2026-07-22T06:39:00.000Z",
    createdAtLabel: "45 minutes ago",
    likeCount: 7,
    replies: [
      {
        id: "thread-comment-2",
        body: "Thanks! So if we have 10 voting shares and 50 loot tokens, quorum is still calculated against 10, not 60?",
        author: {
          name: "Anonymous",
          avatarColor: "#10b981",
        },
        createdAt: "2026-07-22T06:54:00.000Z",
        createdAtLabel: "30 minutes ago",
        likeCount: 2,
        replies: [
          {
            id: "thread-comment-3",
            body: "Exactly right. The `totalShares` variable only counts governance shares. Loot (`totalLoot`) is tracked separately and never factors into quorum.",
            author: {
              name: "Dr. Rivera",
              avatarColor: "#7c3aed",
              badges: ["Staff"],
            },
            createdAt: "2026-07-22T07:02:00.000Z",
            createdAtLabel: "22 minutes ago",
            likeCount: 4,
            isLiked: true,
            replies: [
              {
                id: "thread-comment-4",
                body: "This distinction is worth adding to the DAO glossary: `totalShares` is governance power, while `totalLoot` is economic stake only.",
                author: {
                  name: "Kai L.",
                  avatarColor: "#f59e0b",
                },
                createdAt: "2026-07-22T07:09:00.000Z",
                createdAtLabel: "15 minutes ago",
                likeCount: 1,
              },
            ],
          },
        ],
      },
    ],
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
