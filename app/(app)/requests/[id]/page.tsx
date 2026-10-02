"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PriorityBadge, StatusBadge } from "@/app/components/StatusBadge";
import { ErrorState, LoadingList } from "@/app/components/states";
import { canModify, useUser } from "@/app/components/UserContext";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import { useAsync } from "@/lib/client/useAsync";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const { data, error, loading, reload } = useAsync((signal) => api.getRequest(id, signal), [id]);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this request? This can't be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteRequest(id);
      router.replace("/dashboard");
    } catch {
      setDeleting(false); // the error toast was already shown
    }
  }

  return (
    <>
      <Link href="/dashboard" className="link">← All requests</Link>
      {loading && <LoadingList rows={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <article className="card detail">
          <div className="detail__head">
            <h1 className="page__title">{data.title}</h1>
            <div className="detail__badges">
              <StatusBadge status={data.status} />
              <PriorityBadge priority={data.priority} />
            </div>
          </div>

          <p className="detail__body">{data.description}</p>

          <dl className="meta">
            <div><dt>Requested by</dt><dd>{data.createdBy.name ?? data.createdBy.email}</dd></div>
            <div><dt>Created</dt><dd>{formatDate(data.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(data.updatedAt)}</dd></div>
          </dl>

          <div className="form__actions">
            {user.role === "ADMIN" && (
              <button type="button" className="btn btn--danger btn--sm" onClick={onDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            {canModify(user, data.createdById) && (
              <Link href={`/requests/${data.id}/edit`} className="btn btn--primary btn--sm">Edit</Link>
            )}
          </div>
        </article>
      )}
    </>
  );
}
