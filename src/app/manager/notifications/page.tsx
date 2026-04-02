import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function ManagerNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "EMPLOYEE") redirect("/employee/notifications");

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        <Link href="/manager" className="text-sm text-sky-700 hover:underline">
          Dashboard
        </Link>
      </div>
      <NotificationList items={items} />
    </div>
  );
}
