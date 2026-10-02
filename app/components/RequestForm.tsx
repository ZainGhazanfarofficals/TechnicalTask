"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, type ServiceRequest } from "@/lib/client/api";
import { apiFieldErrors, validateWith, type FieldErrors } from "@/lib/client/forms";
import {
  PRIORITY_LABELS,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  STATUS_LABELS,
  type RequestPriority,
  type RequestStatus,
} from "@/lib/shared/constants";
import { createRequestSchema, generateRequestSchema, updateRequestSchema, type CreateRequestInput } from "@/lib/shared/schemas";
import Field from "./Field";
import { useUser } from "./UserContext";

type Values = { title: string; description: string; priority: RequestPriority; status: RequestStatus };

/** One form for both create (no `request`) and edit. Only admins see the status control. */
export default function RequestForm({ request }: { request?: ServiceRequest }) {
  const router = useRouter();
  const user = useUser();
  const [values, setValues] = useState<Values>({
    title: request?.title ?? "",
    description: request?.description ?? "",
    priority: request?.priority ?? "MEDIUM",
    status: request?.status ?? "OPEN",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [issue, setIssue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const showStatus = !!request && user.role === "ADMIN";
  const set = <K extends keyof Values>(key: K) =>
    (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value as Values[K] }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      ...(showStatus && { status: values.status }),
    };
    const checked = request
      ? validateWith(updateRequestSchema, payload)
      : validateWith(createRequestSchema, payload);
    if (!checked.ok) return setErrors(checked.errors);
    setErrors({});

    setBusy(true);
    try {
      const saved = request
        ? await api.updateRequest(request.id, checked.data)
        : await api.createRequest(checked.data as CreateRequestInput);
      router.replace(`/requests/${saved.id}`);
      router.refresh();
    } catch (err) {
      setErrors(apiFieldErrors(err));
      setBusy(false);
    }
  }

  async function onGenerate() {
    const checked = validateWith(generateRequestSchema, { issue });
    if (!checked.ok) return toast.error(checked.errors.issue ?? "Describe the issue first.");
    setGenerating(true);
    try {
      const draft = await api.generateRequest(checked.data.issue);
      setValues((v) => ({ ...v, ...draft }));
      setErrors({});
    } catch {
      // toast already shown
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      {!request && (
        <div className="ai">
          <label className="field__label" htmlFor="issue">Describe the issue briefly</label>
          <div className="ai__row">
            <input
              id="issue"
              className="field__input"
              placeholder="e.g. Website checkout is failing for some customers"
              value={issue}
              maxLength={500}
              onChange={(e) => setIssue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onGenerate();
                }
              }}
            />
            <button type="button" className="btn btn--secondary" onClick={onGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <p className="ai__hint">Fills in the title, description and priority. You can edit everything before saving.</p>
        </div>
      )}

      <Field id="title" label="Title" value={values.title} error={errors.title} onChange={set("title")} maxLength={120} />

      <div className="field">
        <label className="field__label" htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          className="field__input"
          value={values.description}
          maxLength={2000}
          aria-invalid={errors.description !== undefined}
          onChange={set("description")}
        />
        {errors.description && <p className="field__error">{errors.description}</p>}
      </div>

      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="priority">Priority</label>
          <select id="priority" className="field__input" value={values.priority} onChange={set("priority")}>
            {REQUEST_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>

        {showStatus && (
          <div className="field">
            <label className="field__label" htmlFor="status">Status</label>
            <select id="status" className="field__input" value={values.status} onChange={set("status")}>
              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form__actions">
        <Link href={request ? `/requests/${request.id}` : "/dashboard"} className="btn btn--secondary">Cancel</Link>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Saving…" : request ? "Save changes" : "Create request"}
        </button>
      </div>
    </form>
  );
}
