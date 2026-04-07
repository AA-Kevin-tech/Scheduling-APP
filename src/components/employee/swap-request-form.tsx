"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createSwapRequest } from "@/actions/swaps";

type Emp = {
  id: string;
  user: { name: string | null; email: string | null };
  departmentIds: string[];
};
type Asg = {
  id: string;
  shift: {
    startsAt: Date;
    endsAt: Date;
    department: { id: string; name: string };
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
  const [fromId, setFromId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [showAllColleagues, setShowAllColleagues] = useState(false);

  const selectedAssignment = useMemo(
    () => myAssignments.find((a) => a.id === fromId),
    [myAssignments, fromId],
  );
  const shiftDeptId = selectedAssignment?.shift.department.id;

  const departmentColleagues = useMemo(() => {
    if (!shiftDeptId) return colleagues;
    return colleagues.filter((c) => c.departmentIds.includes(shiftDeptId));
  }, [colleagues, shiftDeptId]);

  const visibleColleagues = showAllColleagues || !shiftDeptId ? colleagues : departmentColleagues;

  useEffect(() => {
    if (!shiftDeptId || colleagues.length === 0) return;
    if (departmentColleagues.length === 0) {
      setShowAllColleagues(true);
    }
  }, [shiftDeptId, departmentColleagues.length, colleagues.length]);

  useEffect(() => {
    if (!targetId) return;
    if (!visibleColleagues.some((c) => c.id === targetId)) {
      setTargetId("");
    }
  }, [targetId, visibleColleagues]);

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
          value={fromId}
          onChange={(e) => {
            setFromId(e.target.value);
            setShowAllColleagues(false);
          }}
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
      <div className="space-y-2">
        <label className="block text-sm">
          <span className="text-slate-600">Other employee</span>
          {selectedAssignment && !showAllColleagues && shiftDeptId ? (
            <span className="mt-0.5 block text-xs text-slate-500">
              Suggesting people assigned to {selectedAssignment.shift.department.name}. Role and
              hours are still checked when you submit.
            </span>
          ) : selectedAssignment && showAllColleagues ? (
            <span className="mt-0.5 block text-xs text-slate-500">
              Showing all employees. Department and role rules still apply at submit.
            </span>
          ) : null}
          <select
            name="targetEmployeeId"
            required
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={!fromId}
            className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 px-3 py-2.5 text-base disabled:bg-slate-100"
          >
            <option value="">{fromId ? "Select…" : "Choose your shift first"}</option>
            {visibleColleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.user.name ?? c.user.email}
              </option>
            ))}
          </select>
        </label>
        {fromId && shiftDeptId && departmentColleagues.length < colleagues.length ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showAllColleagues}
              onChange={(e) => setShowAllColleagues(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show all employees (not only {selectedAssignment?.shift.department.name})
          </label>
        ) : null}
        {fromId && shiftDeptId && departmentColleagues.length === 0 && !showAllColleagues ? (
          <p className="text-xs text-amber-800">
            No other employees are assigned to this department. Turn on &quot;Show all
            employees&quot; to pick someone else — they must still be eligible for the shift.
          </p>
        ) : null}
      </div>
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
