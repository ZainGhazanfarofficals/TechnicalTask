import { apiFetch } from "./http";
import type { RequestPriority, RequestStatus, Role } from "@/lib/shared/constants";
import type { CreateRequestInput, LoginInput, RegisterInput, UpdateRequestInput } from "@/lib/shared/schemas";

export type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null; email: string };
};

export type GeneratedRequest = { title: string; description: string; priority: RequestPriority };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type AuthUser = { id: string; name: string | null; email: string; role: Role };

export const api = {
  login: (body: LoginInput) =>
    apiFetch<AuthUser>("/auth/login", { method: "POST", body, successMessage: (u: AuthUser) => `Welcome back, ${u.name ?? u.email}.` }),
  register: (body: RegisterInput) =>
    apiFetch<AuthUser>("/auth/register", { method: "POST", body, successMessage: (u: AuthUser) => `Account created. Welcome, ${u.name ?? u.email}!` }),
  logout: () => apiFetch<{ ok: true }>("/auth/logout", { method: "POST", successMessage: "Signed out." }),

  listRequests: (q: { status?: RequestStatus; page: number }, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(q.page) });
    if (q.status) params.set("status", q.status);
    return apiFetch<Page<ServiceRequest>>(`/requests?${params}`, { signal });
  },
  getRequest: (id: string, signal?: AbortSignal) => apiFetch<ServiceRequest>(`/requests/${id}`, { signal }),
  createRequest: (body: CreateRequestInput) =>
    apiFetch<ServiceRequest>("/requests", { method: "POST", body, successMessage: "Request created." }),
  updateRequest: (id: string, body: UpdateRequestInput) =>
    apiFetch<ServiceRequest>(`/requests/${id}`, { method: "PATCH", body, successMessage: "Request updated." }),
  deleteRequest: (id: string) =>
    apiFetch<{ ok: true }>(`/requests/${id}`, { method: "DELETE", successMessage: "Request deleted." }),
  generateRequest: (issue: string) =>
    apiFetch<GeneratedRequest>("/requests/generate", { method: "POST", body: { issue }, successMessage: "Draft generated. Review it before saving." }),
};
