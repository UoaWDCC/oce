import { IChatBox } from "../chatBox";
import ChatScreen from "./chatScreen";
import ConversationsList from "./conversationsList";

export default function chatArea({ open, toggleOpen }: IChatBox) {
  return (
    <div className="fixed top-0 left-0 h-full w-full p-0 z-30 bg-white">
      <div className="flex h-full w-full p-5">
        <div className="w-full flex gap-3">
          <ConversationsList />
          <ChatScreen open={true} toggleOpen={toggleOpen} />
        </div>
      </div>
    </div>
  );
}
