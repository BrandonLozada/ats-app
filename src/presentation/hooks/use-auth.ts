"use client";

import { AuthClient } from "@/modules/identity/public";

// Client Side (For UI purposes)
export function useAuth() {
  const { data: session, isPending, error, refetch } = AuthClient.useSession();

  return {
    session,
    user: session?.user ?? null,
    isLoading: isPending,
    error,
    refetch,
    isAuthenticated: !!session?.user,
  };
}
