import { ForumPanel } from "@/features/chat-forum";
import {
  mockForumCommentPreviews,
  mockForumPostPreviews,
} from "@/features/chat-forum/mocks";
import { DAO } from "./types";

type DaoForumProps = {
  dao: DAO;
  daoGroupId: string;
};

export default function DaoForum({ dao, daoGroupId }: DaoForumProps) {
  return (
    <ForumPanel
      comments={mockForumCommentPreviews}
      daoGroupId={daoGroupId}
      daoName={dao.Name}
      posts={mockForumPostPreviews.map((post) => ({
        ...post,
        daoId: dao.Name,
      }))}
    />
  );
}
