import { redirect } from "next/navigation";
import RequestForm from "@/app/components/RequestForm";
import { getSession } from "@/lib/server/session";

export default async function NewRequestPage() {
  // Admins moderate requests but can't create them.
  if ((await getSession())?.role === "ADMIN") redirect("/dashboard");
  return (
    <>
      <h1 className="page__title">New service request</h1>
      <RequestForm />
    </>
  );
}
