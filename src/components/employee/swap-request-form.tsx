"use client";

import { useActionState, useMemo, useState } from "react";
import { createSwapRequest } from "@/actions/swaps";

type Emp = { id: string; user: { name: string | null; email: string | null } };
type Asg = {
  id: string;
  shift: {
    startsAt: Date;
    endsAt: Date;
    department: { name: string };
  };
};
type PeerAsg = {
  id: string;
  employeeId: string;
  label: string;
};

export function SwapRequestForm({
  myAssignments,
  colleagues,
  peerAssignments,
}: {
  myAssignments: Asg[];
  colleagues: Emp[];
  peerAssignments: PeerAsg[];
}) {
  const [state, action, pending] = useActionState(createSwapRequest, {});
  const [targetId, setTargetId] = useState("");

  const theirShifts = useMemo(
    () => peerAssignments.filter((p) => p.employeeId === targetId),
    [peerAssignments, targetId],
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-slate-800">Request a swap</h2>
      <label className="block text-sm">
        <span className="text-slate-600">Your shift to offer</span>
        <select
          name="fromAssignmentId"
          required
          className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 px-3 py-2.5 text-base"
        >
          <option value="">Select…</option>
          {myAssignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.shift.department.name} · {new Date(a.shift.startsAt).toLocaleString()}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Other employee</span>
        <select
          name="targetEmployeeId"
          required
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 px-3 py-2.5 text-base"
        >
          <option value="">Select…</option>
          {colleagues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.user.name ?? c.user.email}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">
          Their shift to trade (optional — one-way if empty)
        </span>
        <select
          name="toAssignmentId"
          disabled={!targetId || theirShifts.length === 0}
          className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 px-3 py-2.5 text-base disabled:bg-slate-100"
        >
          <option value="">One-way: they take your shift only</option>
          {theirShifts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || myAssignments.length === 0}
        className="w-full min-h-12 rounded-lg bg-sky-700 py-3 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
