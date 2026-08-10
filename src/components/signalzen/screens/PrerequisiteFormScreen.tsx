import { useState } from "react";
import { ArrowRightIcon } from "../icons";
import type { Field, FieldOption } from "../backend";
import { cn } from "@/lib/utils";

type FieldValues = Record<number, string>;
type FieldErrors = Record<number, boolean>;

const prereqInput =
  "block w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/30";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: Field[], values: FieldValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const val = (values[field.id] ?? "").trim();
    if (field.kind === "checkbox") {
      if (field.required && val !== "yes") errors[field.id] = true;
    } else if (field.kind === "email") {
      if (field.required && !val) {
        errors[field.id] = true;
      } else if (val && !EMAIL_RE.test(val)) {
        errors[field.id] = true;
      }
    } else {
      if (field.required && !val) errors[field.id] = true;
    }
  }
  return errors;
}

function defaultValues(fields: Field[]): FieldValues {
  const values: FieldValues = {};
  for (const field of fields) {
    if (field.kind === "selectbox") {
      const def = field.options?.find((o) => o.default);
      if (def) values[field.id] = def.title;
    }
  }
  return values;
}

function PrereqLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </span>
  );
}

function FormField({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string;
  error: boolean;
  onChange: (v: string) => void;
}) {
  const errorClass = error ? "border-destructive bg-destructive/5" : "";

  if (field.kind === "checkbox") {
    return (
      <label
        className={cn(
          "flex items-center gap-2.5 rounded-md border p-2.5 transition-colors",
          error ? "border-destructive bg-destructive/5" : "border-border",
        )}
      >
        <input
          type="checkbox"
          checked={value === "yes"}
          onChange={(e) => onChange(e.target.checked ? "yes" : "no")}
          className="accent-accent"
        />
        <span className="text-[13px] leading-relaxed text-foreground">
          {field.title}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <PrereqLabel label={field.title} required={field.required} />
      {field.kind === "textarea" ? (
        <textarea
          placeholder={field.title}
          value={value}
          maxLength={224}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={cn(prereqInput, "resize-none", errorClass)}
        />
      ) : field.kind === "selectbox" ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(prereqInput, "appearance-none cursor-pointer pr-7", errorClass)}
          >
            {!field.options?.some((o) => o.default) && (
              <option value="" disabled>
                {field.title}
              </option>
            )}
            {(field.options ?? []).map((opt: FieldOption) => (
              <option key={opt.id} value={opt.title}>
                {opt.title}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute inset-y-0 right-2 my-auto h-3.5 w-3.5 opacity-50"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </div>
      ) : (
        <input
          type={field.kind === "email" ? "email" : "text"}
          placeholder={field.title}
          value={value}
          maxLength={224}
          onChange={(e) => onChange(e.target.value)}
          className={cn(prereqInput, errorClass)}
        />
      )}
    </label>
  );
}

export function PrerequisiteFormScreen({
  fields,
  onSubmit,
}: {
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<FieldValues>(() => defaultValues(fields));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = (id: number, field: Field) => (v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    if (errors[id]) {
      const cleared = field.kind === "email" ? EMAIL_RE.test(v.trim()) : !!v.trim();
      if (cleared) setErrors((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(fields, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const result: Record<string, string> = {};
    for (const field of fields) result[field.title] = values[field.id] ?? "";
    onSubmit(result);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin px-4 py-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        noValidate
      >
        <div className="mb-3">
          <h3 className="m-0 text-[14px] font-semibold text-foreground">Before we start</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            A few quick details help us reply faster.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((field) => (
            <FormField
              key={field.id}
              field={field}
              value={values[field.id] ?? ""}
              error={!!errors[field.id]}
              onChange={set(field.id, field)}
            />
          ))}
        </div>

        <button
          type="submit"
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-foreground shadow-sm hover:brightness-110"
        >
          Start chat
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
