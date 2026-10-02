import { redirect } from "next/navigation";
import AppShell from "../components/AppShell";
import { getSession } from "@/lib/server/session";
import "./app.css";

// Reads the session cookie per request, so these pages are always dynamic.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { id, name, email, role } = session;
  return <AppShell user={{ id, name, email, role }}>{children}</AppShell>;
}
