interface ConversationPropsType {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
}
export default function Conversation({ name, isSelected, onSelect }: ConversationPropsType) {
  return (
    <button
      className={`flex min-w-0 outline outline-message-grey rounded-2xl w-full p-2 text-sm font-bold ${isSelected ? "bg-message-grey" : "hover:bg-message-grey"}`}
      onClick={onSelect}
    >
      <span className="truncate">{name}</span>
    </button>
  );
}
