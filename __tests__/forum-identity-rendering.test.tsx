import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ForumPanel from "@/features/chat-forum/components/ForumPanel";
import StudentAvatar from "@/components/common/StudentAvatar";
import type {
  ForumCommentPreview,
  ForumPostPreview,
} from "@app-types/dao-forum";

vi.mock("@/components/dao-forum/NewPostDialog", () => ({
  default: () => null,
}));
vi.mock("@/components/dao-forum/CommentEntryComposer", () => ({
  default: () => null,
}));
vi.mock("@/components/dao-forum/PostEntryComposer", () => ({
  default: () => null,
}));
vi.mock("@/features/chat-forum/hooks/useDaoForumPoll", () => ({
  useDaoForumPoll: () => ({ poll: null, isLoading: false, error: null }),
}));

afterEach(() => {
  cleanup();
});

describe("forum identity rendering", () => {
  it.each(["xs", "sm", "md", "lg"] as const)(
    "preserves text metadata without an avatar at size %s",
    (size) => {
      const { container } = render(
        <StudentAvatar
          displayName="Jordan Smith"
          walletAddress="0x1234567890123456789012345678901234567890"
          badges={<span>Staff</span>}
          timestamp={{ label: "Today", dateTime: "2026-09-27" }}
          size={size}
        />,
      );
      expect(screen.getByText("Jordan Smith")).toBeTruthy();
      expect(screen.getByText("0x1234...7890")).toBeTruthy();
      expect(screen.getByText("Staff")).toBeTruthy();
      expect(screen.getByText("Today").getAttribute("datetime")).toBe(
        "2026-09-27",
      );
      expect(screen.queryByText("JS")).toBeNull();
      expect(container.querySelector("img, .rounded-full")).toBeNull();
    },
  );

  it.each([false, true])(
    "shows one identity per author (ENS: %s)",
    (hasEns) => {
      const wallets = [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
        "0x3333333333333333333333333333333333333333",
      ];
      const names = hasEns ? ["post.eth", "comment.eth", "reply.eth"] : wallets;
      const post: ForumPostPreview = {
        id: "post-1",
        daoId: "dao-1",
        title: "Identity test post",
        excerpt: "Post body",
        authorName: names[0],
        authorWallet: wallets[0],
        authorEns: hasEns ? names[0] : undefined,
        createdAt: "2026-07-22T00:00:00.000Z",
        createdAtLabel: "Jul 22, 2026",
        commentCount: 2,
        viewCount: 0,
        types: [],
        tags: [],
      };
      const comments: ForumCommentPreview[] = [1, 2].map((index) => ({
        id: `comment-${index}`,
        postId: post.id,
        parentCommentId: index === 2 ? "comment-1" : null,
        authorName: names[index],
        authorWallet: wallets[index],
        authorEns: hasEns ? names[index] : undefined,
        body: `Comment body ${index}`,
        createdAt: post.createdAt,
        createdAtLabel: post.createdAtLabel,
        likeCount: 0,
      }));
      render(
        <ForumPanel
          daoGroupId="dao-1"
          daoName="DAO"
          posts={[post]}
          comments={comments}
        />,
      );

      expect(screen.getAllByText(names[0], { selector: "p" })).toHaveLength(1);
      expect(screen.queryByTitle(wallets[0])).toBeNull();
      expect(screen.queryAllByRole("img")).toHaveLength(0);
      expect(screen.queryByText(names[0].slice(0, 2).toUpperCase())).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: /Identity test post/ }),
      );

      names.forEach((name, index) => {
        expect(screen.getAllByText(name, { selector: "p" })).toHaveLength(1);
        expect(screen.queryByText(name.slice(0, 2).toUpperCase())).toBeNull();
        expect(screen.queryByTitle(wallets[index])).toBeNull();
        expect(
          screen.queryByText(
            `${wallets[index].slice(0, 6)}...${wallets[index].slice(-4)}`,
          ),
        ).toBeNull();
        if (hasEns) expect(screen.queryByText(wallets[index])).toBeNull();
      });
      expect(screen.queryAllByRole("img")).toHaveLength(0);
      expect(
        screen.getAllByText(post.createdAtLabel).length,
      ).toBeGreaterThanOrEqual(2);
    },
  );
});
