import Conversation from "./conversation";

interface ConversationType {
  id: string;
  name: string;
}

const conversations: ConversationType[] = [
  { id: "1", name: "convo 1" },
  { id: "2", name: "convo 2" },
  { id: "3", name: "convo 3" },
];

export default function ConversationsList() {
  //NOTE: the way that conversations are passed inside is not final and needs to be changed to fit the API response.
  return (
    <div className="rounded-2xl h-full shadow-xl outline outline-message-grey overflow-y-auto flex flex-col p-4 min-w-1/7 gap-2">
      {conversations.map((conversation) => {
        const { name, id } = conversation;
        return <Conversation name={name} key={id}></Conversation>;
      })}
    </div>
  );
}
