"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import RequestForm from "@/app/components/RequestForm";
import { ErrorState, LoadingList } from "@/app/components/states";
import { canModify, useUser } from "@/app/components/UserContext";
import { api } from "@/lib/client/api";
import { useAsync } from "@/lib/client/useAsync";

export default function EditRequestPage() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const { data, error, loading, reload } = useAsync((signal) => api.getRequest(id, signal), [id]);

  return (
    <>
      <h1 className="page__title">Edit request</h1>
      {loading && <LoadingList rows={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (canModify(user, data.createdById) ? (
        <RequestForm request={data} />
      ) : (
        <ErrorState error={new Error("You can only edit your own requests.")} />
      ))}
      {!loading && <Link href="/dashboard" className="link">Back to dashboard</Link>}
    </>
  );
}
