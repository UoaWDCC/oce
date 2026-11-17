import ChatArea from "./fullscreen/chatArea";

export interface ChatSectionProps {
  type: "box" | "fullscren";
}

export default function ChatSection() {
  return <ChatArea />;
}
