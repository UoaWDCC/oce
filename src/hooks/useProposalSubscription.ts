import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

/**
 * Hook to listen for real-time proposal updates via Supabase Realtime
 *
 * This is:
 * - SECURE: No API keys exposed (uses existing Supabase auth)
 * - EFFICIENT: Zero RPC calls, single WebSocket connection
 * - REAL-TIME: Push-based updates, not polling
 *
 * REQUIREMENT: Your backend APIs must update Supabase after blockchain operations.
 * When a vote is cast or proposal status changes, update the DAO.Proposals field.
 *
 * @template T - The proposal type used by the consuming component
 */
export function useProposalSubscription<T = unknown>(
  daoId: string | null | undefined,
  handlers: {
    onProposalsUpdated?: (proposals: T[]) => void;
  },
  enabled: boolean = true,
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!daoId || !enabled) return;

    console.log("🔌 Setting up Supabase subscription for DAO:", daoId);

    const channel = supabase
      .channel(`dao-proposals-${daoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "DAO",
          filter: `DAOID=eq.${daoId}`,
        },
        (payload) => {
          console.log("📨 Supabase Realtime payload received:", payload);
          const newData = payload.new as { Proposals?: T[] };
          if (newData.Proposals) {
            console.log(
              "📡 Proposals updated via Supabase Realtime, count:",
              newData.Proposals.length,
            );
            handlersRef.current.onProposalsUpdated?.(newData.Proposals);
          } else {
            console.log("⚠️ Payload received but no Proposals field");
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Supabase subscription active for DAO:", daoId);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Supabase subscription error:", err);
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Supabase subscription timed out");
        } else {
          console.log("📡 Supabase subscription status:", status);
        }
      });

    return () => {
      console.log("🔌 Removing Supabase subscription for DAO:", daoId);
      supabase.removeChannel(channel);
    };
  }, [daoId, enabled]);
}
