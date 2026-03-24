import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

interface DaoSubscriptionHandlers<T = Record<string, unknown>> {
  onDaoCreated?: (dao: T) => void;
  onDaoUpdated?: (dao: T) => void;
  onDaoDeleted?: (daoId: string) => void;
}

export function useDaoSubscription<T = Record<string, unknown>>(
  handlers: DaoSubscriptionHandlers<T>,
  enabled: boolean = true,
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient(); // ✅ Inside useEffect, singleton returns same instance

    const channel = supabase
      .channel("dao-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "DAO" },
        (payload) => {
          handlersRef.current.onDaoCreated?.(payload.new as T);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "DAO" },
        (payload) => {
          handlersRef.current.onDaoUpdated?.(payload.new as T);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "DAO" },
        (payload) => {
          handlersRef.current.onDaoDeleted?.(payload.old.DAOID as string);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]); // Only enabled, not supabase
}
