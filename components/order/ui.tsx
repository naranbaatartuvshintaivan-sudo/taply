"use client";

import type { ReactNode } from "react";

// Захиалгын form-уудын нийтлэг хэсгүүд (энгийн ба custom)

export const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";
export const btnSolid =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-9 text-[15px] font-bold text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:bg-[#9a9a9a]";
export const btnLine =
  "inline-flex min-h-14 items-center justify-center rounded-full border-[1.5px] border-ink px-9 text-[15px] font-bold hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

const inputCls =
  "block w-full min-h-[52px] rounded-none border-0 border-b-[1.5px] border-ink bg-transparent px-0 py-3 text-lg outline-none placeholder:text-[#b5b5b5] focus:border-b-[3px] aria-[invalid=true]:border-[#c62828]";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={`${eyebrow} block text-mute`}>{label}</span>
      <div className="mt-2">{children}</div>
      {error ? (
        <span role="alert" className="mt-2 block text-sm font-medium text-[#c62828]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-2 block text-sm text-mute">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return <input {...rest} aria-invalid={invalid || undefined} className={`${inputCls} ${className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${inputCls} min-h-[96px] resize-y ${className ?? ""}`}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; children: ReactNode },
) {
  const { invalid, className, children, ...rest } = props;
  return (
    <select {...rest} aria-invalid={invalid || undefined} className={`${inputCls} cursor-pointer ${className ?? ""}`}>
      {children}
    </select>
  );
}

export function Stepper({
  value,
  onChange,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  label: string;
}) {
  const b =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-ink text-xl font-medium hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink";
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={b} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`${label} хасах`}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        aria-label={`${label} тоо`}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0);
        }}
        className="h-11 w-14 [appearance:textfield] border-0 bg-transparent text-center text-xl font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={b} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} нэмэх`}>
        +
      </button>
    </div>
  );
}

export function StepNav({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="m-0 flex list-none flex-wrap gap-x-8 gap-y-3 p-0">
      {steps.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={`text-sm font-medium ${i === current ? "text-ink" : i < current ? "text-body" : "text-[#b5b5b5]"}`}
        >
          <span className="mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export function SummaryRow({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 border-t border-line py-[18px] ${strong ? "text-xl font-extrabold" : "text-base"}`}>
      <span className={strong ? "" : "text-body"}>{k}</span>
      <span className={`text-right ${strong ? "" : "font-bold"}`}>{v}</span>
    </div>
  );
}
