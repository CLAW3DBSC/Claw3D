"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  PackagedSkillSetupDefinition,
  PackagedSkillSetupValues,
} from "@/lib/skills/packaged-setup";

type PackagedSkillSetupModalProps = {
  skillName: string;
  definition: PackagedSkillSetupDefinition;
  initialValues?: PackagedSkillSetupValues;
  busy?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: PackagedSkillSetupValues) => Promise<void> | void;
};

export function PackagedSkillSetupModal({
  skillName,
  definition,
  initialValues,
  busy = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: PackagedSkillSetupModalProps) {
  const [values, setValues] = useState<PackagedSkillSetupValues>(() => initialValues ?? {});

  useEffect(() => {
    setValues(initialValues ?? {});
  }, [definition, initialValues, skillName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) {
        return;
      }
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  const missingRequiredField = useMemo(
    () =>
      definition.fields.find((field) => field.required && !(values[field.key] ?? "").trim()) ?? null,
    [definition.fields, values]
  );

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${definition.title} for ${skillName}`}
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <form
        className="w-full max-w-lg rounded-3xl border border-cyan-500/20 bg-[#050607] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || missingRequiredField) {
            return;
          }
          void Promise.resolve(onSubmit(values)).catch(() => undefined);
        }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/75">
          Install setup
        </div>
        <div className="mt-2 font-mono text-[15px] font-semibold text-white">
          {definition.title} for {skillName}
        </div>
        <div className="mt-2 text-sm leading-relaxed text-white/65">{definition.description}</div>

        <div className="mt-4 space-y-3">
          {definition.fields.map((field) => {
            const value = values[field.key] ?? "";
            return (
              <label key={field.key} className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
                  {field.label}
                </div>
                <div className="mt-1 text-[11px] text-white/45">{field.description}</div>
                {field.multiline ? (
                  <textarea
                    value={value}
                    rows={3}
                    disabled={busy}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                ) : (
                  <input
                    value={value}
                    disabled={busy}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )}
              </label>
            );
          })}
        </div>

        {missingRequiredField ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {missingRequiredField.label} is required.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || Boolean(missingRequiredField)}
            className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Working..." : definition.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
