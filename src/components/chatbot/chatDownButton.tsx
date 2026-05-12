import Image from "next/image";
import { ReactNode } from "react";

interface IChatDownButtonProps {
  scrollDown(): void;
}

//TODO: has not yet been tested/implemented in practice.
export default async function ChatDownButton({
  scrollDown,
}: IChatDownButtonProps): Promise<ReactNode> {
  return (
    <button onClick={() => scrollDown()}>
      <Image
        src={"/downButton.svg"}
        alt="scroll down to the bottom of the chat"
        height={30}
        width={30}
      />
    </button>
  );
}
