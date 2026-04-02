"use client";

import { useActionState } from "react";

type State = { ok?: boolean; error?: string } | null;

export function DeleteResourceForm({
  action,
  id,
  label = "Delete",
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  id: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {state?.error ? (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
