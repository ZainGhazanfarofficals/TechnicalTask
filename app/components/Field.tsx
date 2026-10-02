"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  error?: string;
  aside?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Field({ id, label, error, aside, type, ...input }: Props) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  const control = (
    <input
      id={id}
      name={id}
      className={`field__input${isPassword ? " field__input--toggle" : ""}`}
      type={isPassword && visible ? "text" : type}
      aria-invalid={error !== undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...input}
    />
  );

  return (
    <div className="field">
      <div className="field__row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      {isPassword ? (
        <div className="field__wrap">
          {control}
          <button
            type="button"
            className="field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>
      ) : (
        control
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
