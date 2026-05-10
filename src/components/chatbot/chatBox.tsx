"use client";

import { ReactNode } from "react";

interface IChatBox {
  open: boolean;
  children: ReactNode;
}

export default function ChatBox({ open, children }: IChatBox) {
  return (
    <div
      className={`${open ? `` : `hidden`} flex flex-col pl-3 rounded-2xl min-h-1/3 absolute bottom-5 right-5 max-h-1/2 w-1/4 bg-white shadow-xl `}
    >
      <div className="relative top-0 h-15 flex items-center bg-[#5e00b2] w-full px-5 py-2 rounded-tr-2xl rounded-tl-2xl">
        <p className="font-bold text-white text-lg">AI Tutor</p>
      </div>
      <div className="relative h-full overflow-y-auto py-3">
        <div className="p-3 flex flex-col w-full gap-5">{children}</div>
      </div>
    </div>
  );
}
