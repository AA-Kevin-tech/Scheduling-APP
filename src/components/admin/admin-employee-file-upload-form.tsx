"use client";

import { useActionState } from "react";
import { uploadEmployeeFile } from "@/actions/admin/employee-files";
import { FieldRow, formControlClassName } from "@/components/ui/field-row";

export function AdminEmployeeFileUploadForm({
  employeeId,
  adminUserIdForRevalidate = "",
}: {
  employeeId: string;
  /** Admin user page path; omit or empty when used on manager employee profile. */
  adminUserIdForRevalidate?: string;
}) {
  const [state, formAction, pending] = useActionState(uploadEmployeeFile, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input
        type="hidden"
        name="adminUserIdForRevalidate"
        value={adminUserIdForRevalidate}
      />
      <FieldRow label="File" fullWidthControl>
        <input
          name="file"
          type="file"
          required
          disabled={pending}
          className={formControlClassName}
        />
      </FieldRow>
      <FieldRow label="Note (optional)" fullWidthControl alignTop>
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          disabled={pending}
          placeholder="e.g. Signed handbook, I-9 copy"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </FieldRow>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-700">File uploaded.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
