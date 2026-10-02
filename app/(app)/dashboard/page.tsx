"use client";

import Link from "next/link";
import { useState } from "react";
import { PriorityBadge, StatusBadge } from "@/app/components/StatusBadge";
import { EmptyState, ErrorState, LoadingList } from "@/app/components/states";
import { useUser } from "@/app/components/UserContext";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import { useAsync } from "@/lib/client/useAsync";
import { REQUEST_STATUSES, STATUS_LABELS, type RequestStatus } from "@/lib/shared/constants";

type Filter = RequestStatus | "ALL";

export default function DashboardPage() {
  const user = useUser();
  const isAdmin = user.role === "ADMIN";
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsync(
    (signal) => api.listRequests({ status: filter === "ALL" ? undefined : filter, page }, signal),
    [filter, page],
  );

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="page__head">
        <div>
          <h1 className="page__title">{isAdmin ? "All service requests" : "My service requests"}</h1>
          {data && <p className="page__sub">{data.total} {data.total === 1 ? "request" : "requests"}</p>}
        </div>
        {!isAdmin && <Link href="/requests/new" className="btn btn--primary btn--sm">New request</Link>}
      </div>

      <div className="seg seg--tabs seg--scroll" role="tablist" aria-label="Filter by status">
        {(["ALL", ...REQUEST_STATUSES] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className="seg__btn"
            onClick={() => changeFilter(f)}
          >
            {f === "ALL" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <section className="list" aria-live="polite">
        {loading && !data && <LoadingList />}
        {error && <ErrorState error={error} onRetry={reload} />}

        {data && data.items.length === 0 && !error && (
          <EmptyState
            title={filter === "ALL" ? "No requests yet" : `No ${STATUS_LABELS[filter].toLowerCase()} requests`}
            action={
              filter === "ALL" ? (
                isAdmin ? undefined : <Link href="/requests/new" className="btn btn--primary btn--sm">Create your first request</Link>
              ) : (
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeFilter("ALL")}>
                  Clear filter
                </button>
              )
            }
          >
            {filter !== "ALL" ? "Try a different status." : isAdmin ? "Requests created by users will show up here." : "Create a service request and it will show up here."}
          </EmptyState>
        )}

        {data && data.items.length > 0 && (
          <ul className={`rows ${loading ? "rows--busy" : ""}`}>
            {data.items.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="row">
                  <div className="row__main">
                    <span className="row__title">{r.title}</span>
                    <span className="row__meta">
                      {isAdmin && <>{r.createdBy.name ?? r.createdBy.email} · </>}
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div className="row__badges">
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data && pages > 1 && (
          <nav className="pager" aria-label="Pagination">
            <button type="button" className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" className="btn btn--secondary btn--sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        )}
      </section>
    </>
  );
}
