interface ConversationPropsType {
  name: string;
}
export default function Conversation({ name }: ConversationPropsType) {
  return (
    <button
      className="flex min-w-0 outline outline-message-grey hover:bg-message-grey rounded-2xl w-full p-2 text-sm font-bold"
      onClick={() => {}}
    >
      <span className="truncate">{name}</span>
    </button>
  );
}
