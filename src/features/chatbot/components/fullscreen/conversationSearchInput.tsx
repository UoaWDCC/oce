import { Search, X } from "lucide-react";

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
    <div className="relative w-full min-w-0 rounded-xl focus-within:ring-2 focus-within:ring-purple-100">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search conversations title"
        aria-label="Search conversations by title"
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-purple-500"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2]"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
