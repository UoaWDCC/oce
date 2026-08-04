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
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      title={name}
    >
      <span className="truncate flex-1">{name}</span>
      <button
        type="button"
        aria-label="End conversation"
        className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("End this conversation?")) onEnd();
        }}
        title="End conversation"
        disabled={isEnding}
      >
        <Trash2 aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
