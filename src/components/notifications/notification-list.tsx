import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import type { Notification } from "@prisma/client";

export function NotificationList({ items }: { items: Notification[] }) {
  return (
    <div className="space-y-3">
      <form action={markAllNotificationsRead}>
        <button
          type="submit"
          className="text-sm text-sky-700 hover:underline"
        >
          Mark all read
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border p-4 shadow-sm ${
              n.readAt ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {n.createdAt.toLocaleString()} · {n.type}
                </p>
              </div>
              {!n.readAt && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800"
                  >
                    Mark read
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No notifications yet.
        </p>
      )}
    </div>
  );
}
