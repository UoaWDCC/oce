"use client";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatSection from "./chatSection";
import ChatButton from "./chatButton";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function ChatWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    }

    checkUser();
  }, []);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="p-5 h-full">
      <ChatModalProvider>
        <ChatSection />
        <div className="fixed bottom-3 right-3 z-30">
          <ChatButton />
        </div>
      </ChatModalProvider>
    </div>
  );
}
