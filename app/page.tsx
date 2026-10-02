import { redirect } from "next/navigation";
import AuthScreen from "./components/AuthScreen";
import { getSession } from "@/lib/server/session";

export default async function Home() {
  if (await getSession()) redirect("/dashboard");
  return <AuthScreen />;
}
