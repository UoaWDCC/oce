"use client";

import { ReactNode } from "react";

interface IChatBox {
  open: boolean;
  children: ReactNode;
}

export default function ChatBox({ open, children }: IChatBox) {
  return (
    <div
      className={`${open ? `` : `hidden`} flex rounded-2xl min-h-1/3 absolute bottom-5 right-5 max-h-1/2 w-1/4 bg-white shadow-xl`}
    >
      <div className="relative top-0 h-15 flex items-center bg-[#5e00b2] w-full px-3 py-2 rounded-tr-2xl rounded-tl-2xl">
        <p className="font-bold text-white text-lg">AI Tutor</p>
        <div className="flex">{children}</div>
      </div>
    </div>
  );
}
