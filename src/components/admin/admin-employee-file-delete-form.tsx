"use client";

import { useActionState } from "react";
import { deleteEmployeeFile } from "@/actions/admin/employee-files";

export function AdminEmployeeFileDeleteForm({
  fileId,
  employeeId,
  adminUserIdForRevalidate,
}: {
  fileId: string;
  employeeId: string;
  adminUserIdForRevalidate: string;
}) {
  const [state, formAction, pending] = useActionState(deleteEmployeeFile, {});

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="fileId" value={fileId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input
        type="hidden"
        name="adminUserIdForRevalidate"
        value={adminUserIdForRevalidate}
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state.error ? (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
