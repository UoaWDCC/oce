import { ForumPanel } from "@/features/chat-forum";
import {
  mockForumCommentPreviews,
  mockForumPostPreviews,
} from "@/features/chat-forum/mocks";
import { DAO } from "./types";

type DaoForumProps = {
  dao: DAO;
};

export default function DaoForum({ dao }: DaoForumProps) {
  return (
    <ForumPanel
      comments={mockForumCommentPreviews}
      daoId={dao.DAOID}
      daoName={dao.Name}
      posts={mockForumPostPreviews.map((post) => ({
        ...post,
        daoId: dao.Name,
      }))}
    />
  );
}
