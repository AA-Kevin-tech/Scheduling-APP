import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function EmployeeNotificationsPage() {
  const { session } = await requireEmployeeProfile();

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Notifications</h1>
        <Link href="/employee" className="text-sm text-sky-700 hover:underline">
          Home
        </Link>
      </div>
      <NotificationList items={items} />
    </div>
  );
}
