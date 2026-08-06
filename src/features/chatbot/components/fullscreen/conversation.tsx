import { Trash2 } from "lucide-react";

interface ConversationPropsType {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  onRequestEnd: (trigger: HTMLButtonElement) => void;
  isEnding: boolean;
}
export default function Conversation({
  name,
  isSelected,
  onSelect,
  onRequestEnd,
  isEnding,
}: ConversationPropsType) {
  return (
    <div
      className={`group flex min-w-0 w-full cursor-pointer items-center rounded-xl border px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
        isSelected
          ? "border-purple-200 bg-purple-100 text-purple-700"
          : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
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
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <button
        type="button"
        aria-label="End conversation"
        className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={(e) => {
          e.stopPropagation();
          onRequestEnd(e.currentTarget);
        }}
        title="End conversation"
        disabled={isEnding}
      >
        <Trash2 aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
