import Image from "next/image";
import { ReactNode } from "react";

export default function ChatInput(): ReactNode {
  return (
    <div className="w-full h-8 px-3 mb-6">
      <div className="shadow-2xl rounded-full h-10 outline-2 outline-[#e9d5ff] flex items-center">
        <input className="text-sm flex-1 h-full pr-3 pl-4 min-w-0" />
        <button className="px-2 flex-shrink-0">
          <Image
            src={"/submitButton.svg"}
            alt="submit question"
            width={30}
            height={30}
          />
        </button>
      </div>
    </div>
  );
}
