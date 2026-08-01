interface ConversationSearchInputPropsType {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export default function ConversationSearchInput({
  value,
  onChange,
  onClear,
}: ConversationSearchInputPropsType) {
  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search conversations title"
        aria-label="Search conversations by title"
        className="w-full outline outline-message-grey rounded-2xl p-2 pr-8 text-sm focus:outline-2 focus:outline-[#5e00b2]"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
