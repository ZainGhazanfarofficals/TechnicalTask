"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/client/api";

const UserContext = createContext<AuthUser | null>(null);
export const UserProvider = UserContext.Provider;

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside <UserProvider>");
  return user;
}

export const canModify = (user: AuthUser, ownerId: string) =>
  user.role === "ADMIN" || user.id === ownerId;
