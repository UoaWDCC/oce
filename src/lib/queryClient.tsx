"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";

interface ErrorWithStatus extends Error {
  status?: number;
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as ErrorWithStatus | undefined)?.status;
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 2;
}

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetry,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions }));

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
