import type { ReactNode } from "react";

export const formControlClassName =
  "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base";

type FieldRowProps = {
  label: string;
  children: ReactNode;
  /** Use for full-width controls (e.g. textarea) without max-w-md on the wrapper. */
  fullWidthControl?: boolean;
  /** Align label to top (e.g. multi-line textarea). */
  alignTop?: boolean;
  className?: string;
};

/**
 * Label + control row: fixed-width label column so inputs align across a page.
 */
export function FieldRow({
  label,
  children,
  fullWidthControl,
  alignTop,
  className,
}: FieldRowProps) {
  const grid =
    alignTop
      ? "grid grid-cols-1 gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-start sm:gap-x-4"
      : "grid grid-cols-1 gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-x-4";
  return (
    <div className={[grid, className].filter(Boolean).join(" ")}>
      <span
        className={
          alignTop
            ? "text-sm text-slate-600 dark:text-zinc-400 sm:pt-1.5"
            : "text-sm text-slate-600 dark:text-zinc-400 sm:pt-0"
        }
      >
        {label}
      </span>
      <div
        className={
          fullWidthControl ? "min-w-0 w-full" : "min-w-0 max-w-md w-full"
        }
      >
        {children}
      </div>
    </div>
  );
}
