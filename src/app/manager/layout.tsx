import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/auth";
import { getVenueSwitcherPayload } from "@/lib/auth/location-scope";
import { canAccessAdminRoutes } from "@/lib/auth/roles";
import { VenueScopeSwitcher } from "@/components/venue-scope-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { RefreshBridge } from "@/components/refresh-bridge";

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/schedule", label: "Schedule" },
  { href: "/terminal/setup", label: "Time clock" },
  { href: "/manager/time-clock", label: "Clock issues" },
  { href: "/manager/employees", label: "Employees" },
  { href: "/manager/employees/onboarding", label: "Onboarding" },
  { href: "/manager/coverage", label: "Coverage" },
  { href: "/manager/holiday-pay", label: "Holiday pay" },
  { href: "/manager/swaps", label: "Swaps" },
  { href: "/manager/time-off", label: "Time off" },
  { href: "/manager/notifications", label: "Alerts" },
  { href: "/manager/attendance", label: "Attendance" },
  { href: "/manager/departments", label: "Departments" },
  { href: "/manager/settings", label: "Settings" },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const showAdmin =
    session?.user?.role != null &&
    canAccessAdminRoutes(session.user.role as UserRole);
  const venuePayload =
    session != null ? await getVenueSwitcherPayload(session) : null;

  return (
    <div className="surface-page min-h-screen lg:flex">
      <aside className="surface-aside border-b lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <span className="font-semibold text-app-heading">Manager</span>
          <SignOutButton className="lg:mt-4 lg:block" />
        </div>
        <nav className="hidden px-2 pb-4 lg:block" aria-label="Manager">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="surface-nav-link block rounded-md px-3 py-2 text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {showAdmin ? (
              <li className="pt-2">
                <Link
                  href="/admin"
                  className="surface-nav-link-accent block rounded-md px-3 py-2 text-sm font-medium"
                >
                  Admin panel →
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
        <nav
          className="flex gap-2 overflow-x-auto px-2 pb-3 lg:hidden"
          aria-label="Manager mobile"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {l.label}
            </Link>
          ))}
          {showAdmin ? (
            <Link
              href="/admin"
              className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </aside>
      <div className="flex-1 p-6">
        {venuePayload ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <VenueScopeSwitcher payload={venuePayload} />
          </div>
        ) : null}
        <RefreshBridge />
        {children}
      </div>
    </div>
  );
}
