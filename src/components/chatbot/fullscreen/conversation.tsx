interface ConversationPropsType {
  name: string;
}
export default function Conversation({ name }: ConversationPropsType) {
  return (
    <button
      className="flex outline outline-message-grey hover:bg-message-grey rounded-2xl w-full p-2 text-sm font-bold"
      onClick={() => {}}
    >
      {name}
    </button>
  );
}
