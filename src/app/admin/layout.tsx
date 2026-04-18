import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { getVenueSwitcherPayload } from "@/lib/auth/location-scope";
import { canAccessItPayrollTimeClockSettings } from "@/lib/auth/roles";
import { VenueScopeSwitcher } from "@/components/venue-scope-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { RefreshBridge } from "@/components/refresh-bridge";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/employee-onboarding", label: "Onboarding" },
  {
    href: "/admin/onboarding-email-templates",
    label: "Onboarding emails",
  },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/time-off-blackouts", label: "Time off blackouts" },
  { href: "/admin/payroll-corrections", label: "Payroll corrections" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/manager/time-clock", label: "Time clock issues" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const venuePayload =
    session != null ? await getVenueSwitcherPayload(session) : null;

  const itPayrollClockLink =
    session?.user &&
    canAccessItPayrollTimeClockSettings(session.user.role as UserRole)
      ? ([
          {
            href: "/it-payroll/time-clock",
            label: "IT/Payroll: time clock & geofence",
          },
        ] as const)
      : [];

  const navLinks = [...links, ...itPayrollClockLink];

  return (
    <div className="surface-page min-h-screen lg:flex">
      <aside className="surface-aside border-b lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <span className="font-semibold text-app-heading">Admin</span>
          <SignOutButton className="lg:mt-4 lg:block" />
        </div>
        <nav className="hidden px-2 pb-4 lg:block" aria-label="Admin">
          <ul className="space-y-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="surface-nav-link block rounded-md px-3 py-2 text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/manager"
                className="surface-nav-link-accent block rounded-md px-3 py-2 text-sm"
              >
                Manager tools →
              </Link>
            </li>
          </ul>
        </nav>
        <nav
          className="flex gap-2 overflow-x-auto px-2 pb-3 lg:hidden"
          aria-label="Admin mobile"
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-zinc-700 dark:bg-black dark:text-zinc-200"
            >
              {l.label}
            </Link>
          ))}
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
