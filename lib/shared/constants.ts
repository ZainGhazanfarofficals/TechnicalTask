export const ROLES = ["USER", "ADMIN"] as const;
export const REQUEST_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const REQUEST_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type Role = (typeof ROLES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
