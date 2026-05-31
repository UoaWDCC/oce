import { notFound } from "next/navigation";
import ChatForumPreviewClient from "./ChatForumPreviewClient";

export default function ChatForumDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ChatForumPreviewClient />;
}
