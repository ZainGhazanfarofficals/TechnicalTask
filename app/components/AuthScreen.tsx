"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/api";
import { ApiClientError } from "@/lib/client/http";
import { apiFieldErrors, validateWith, type FieldErrors } from "@/lib/client/forms";
import { loginSchema, registerSchema } from "@/lib/shared/schemas";
import Field from "./Field";
import "./auth.css";

type Role = "user" | "admin";
type Mode = "signin" | "signup";

type Values = { name: string; email: string; password: string; confirm: string };

const EMPTY: Values = { name: "", email: "", password: "", confirm: "" };

export default function AuthScreen() {
  const [role, setRole] = useState<Role>("user");
  const [mode, setMode] = useState<Mode>("signin");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // Admins can only sign in; sign up is always a user flow.
  const effectiveMode: Mode = role === "admin" ? "signin" : mode;
  const isSignup = effectiveMode === "signup";

  function reset() {
    setErrors({});
  }

  function changeRole(next: Role) {
    setRole(next);
    reset();
  }

  function changeMode(next: Mode) {
    setMode(next);
    reset();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const checked = isSignup
      ? validateWith(registerSchema, { name: values.name, email: values.email, password: values.password })
      : validateWith(loginSchema, { email: values.email, password: values.password, as: role === "admin" ? "admin" : undefined });
    const errs = checked.ok ? {} : checked.errors;
    if (isSignup && values.confirm !== values.password) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (!checked.ok || Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields.", { id: "auth-validation" });
      return;
    }

    setBusy(true);
    try {
      await (isSignup ? api.register(checked.data as never) : api.login(checked.data as never));
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const fields = apiFieldErrors(err);
      // Bad credentials: flag both inputs (message shown once, under the password).
      if (err instanceof ApiClientError && err.code === "INVALID_CREDENTIALS") {
        fields.email = "";
        fields.password = err.message;
      }
      setErrors(fields);
      setBusy(false);
    }
  }

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const title =
    role === "admin" ? "Admin sign in" : isSignup ? "Create your account" : "Welcome back";
  const subtitle =
    role === "admin"
      ? "Admin accounts are issued internally. Sign in to continue."
      : isSignup
        ? "Join in a minute. No hidden fees."
        : "Sign in to manage your account.";

  return (
    <div className="auth">
      <aside className="auth__brand" aria-hidden="true">
        <div className="auth__logo">
          <span className="auth__logo-mark" />
          Assessment
        </div>
        <div>
          <h2 className="auth__headline">Everything in one place.</h2>
          <p className="auth__lede">
            One secure sign-in for people and administrators, built to feel calm and stay out of
            your way.
          </p>
        </div>
        <div className="auth__proof">
          <span className="auth__proof-value">99.99%</span>
          <span className="auth__proof-label">uptime, last 12 months</span>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__logo auth__mobile-logo">
            <span className="auth__logo-mark" />
            Assessment
          </div>

          <h1 className="auth__title">{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>

          <div className="seg" role="tablist" aria-label="Account type">
            {(["user", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={role === r}
                className="seg__btn"
                onClick={() => changeRole(r)}
              >
                {r === "user" ? "User" : "Admin"}
              </button>
            ))}
          </div>

          {role === "user" && (
            <div className="seg seg--tabs" role="tablist" aria-label="Sign in or sign up">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className="seg__btn"
                  onClick={() => changeMode(m)}
                >
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
          )}

          <form className="auth__form" onSubmit={onSubmit} noValidate>
            {isSignup && (
              <Field
                id="name"
                label="Full name"
                autoComplete="name"
                value={values.name}
                error={errors.name}
                onChange={set("name")}
              />
            )}
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              error={errors.email}
              onChange={set("email")}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={values.password}
              error={errors.password}
              onChange={set("password")}
            />
            {isSignup && (
              <Field
                id="confirm"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={values.confirm}
                error={errors.confirm}
                onChange={set("confirm")}
              />
            )}

            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Please wait…" : role === "admin" ? "Sign in as admin" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          {role === "user" && (
            <p className="auth__switch">
              {isSignup ? "Already have an account? " : "New here? "}
              <button
                type="button"
                className="link"
                onClick={() => changeMode(isSignup ? "signin" : "signup")}
              >
                {isSignup ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
