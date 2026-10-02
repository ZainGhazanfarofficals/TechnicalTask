"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api, type AuthUser } from "@/lib/client/api";
import { UserProvider } from "./UserContext";

export default function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await api.logout().catch(() => {});
    router.replace("/");
    router.refresh();
  }

  return (
    <UserProvider value={user}>
      <header className="topbar">
        <Link href="/dashboard" className="auth__logo">
          <span className="auth__logo-mark" />
          Assessment
        </Link>
        <div className="topbar__right">
          <span className="topbar__user">
            {user.name ?? user.email}
            <span className="badge">{user.role === "ADMIN" ? "Admin" : "User"}</span>
          </span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
    </UserProvider>
  );
}
