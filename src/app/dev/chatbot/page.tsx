import { notFound } from "next/navigation";
import ChatbotPreviewClient from "./ChatbotPreviewClient";

export default function ChatbotDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ChatbotPreviewClient />;
}
