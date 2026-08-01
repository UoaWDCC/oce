import { Trash2 } from "lucide-react";

interface ConversationPropsType {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  onEnd: () => void;
  isEnding: boolean;
}
export default function Conversation({
  name,
  isSelected,
  onSelect,
  onEnd,
  isEnding,
}: ConversationPropsType) {
  return (
    <div
      className={`group flex items-center min-w-0 outline outline-message-grey rounded-2xl w-full p-2 text-sm font-bold cursor-pointer ${isSelected ? "bg-message-grey" : "hover:bg-message-grey"}`}
      onClick={onSelect}
      title={name}
    >
      <span className="truncate flex-1">{name}</span>
      <button
        className="opacity-0 group-hover:opacity-100 shrink-0 ml-2 text-gray-400 hover:text-[#5e00b2]"
        onClick={(e) => { e.stopPropagation(); if (window.confirm("End this conversation?")) onEnd(); }}
        title="End conversation"
        disabled={isEnding}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
