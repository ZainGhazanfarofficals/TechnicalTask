import { PRIORITY_LABELS, STATUS_LABELS, type RequestPriority, type RequestStatus } from "@/lib/shared/constants";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`pill pill--${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <span className={`pill pill--prio-${priority.toLowerCase()}`}>{PRIORITY_LABELS[priority]}</span>;
}
