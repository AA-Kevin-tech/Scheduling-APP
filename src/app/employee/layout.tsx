import Link from "next/link";
import { auth } from "@/auth";
import { getVenueSwitcherPayload } from "@/lib/auth/location-scope";
import { getVenueLabelForEmployee } from "@/lib/queries/location-display";
import { VenueScopeSwitcher } from "@/components/venue-scope-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { RefreshBridge } from "@/components/refresh-bridge";

const nav = [
  { href: "/employee", label: "Home" },
  { href: "/employee/schedule", label: "Schedule" },
  { href: "/employee/attendance", label: "Hours" },
  { href: "/employee/availability", label: "Unavail." },
  { href: "/employee/time-off", label: "Off" },
  { href: "/employee/swaps", label: "Swaps" },
  { href: "/employee/notifications", label: "Alerts" },
  { href: "/employee/profile", label: "Profile" },
];

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const employeeId = session?.user?.employeeId;
  const venuePayload =
    session != null ? await getVenueSwitcherPayload(session) : null;
  const venueLabel =
    employeeId != null
      ? await getVenueLabelForEmployee(employeeId)
      : null;
  const headerTitle = venueLabel?.trim() || "Pulse";

  return (
    <div className="surface-page flex min-h-screen flex-col">
      <header className="surface-header sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="shrink-0 text-sm font-semibold text-app-heading">
            {headerTitle}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:max-w-xs sm:items-end">
            {venuePayload ? (
              <VenueScopeSwitcher
                payload={venuePayload}
                label="Location"
                compact
              />
            ) : null}
            <div className="flex justify-end">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-24">
        <RefreshBridge />
        {children}
      </main>
      <nav
        className="sticky bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-900"
        aria-label="Employee"
      >
        <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                title={
                  item.href === "/employee/time-off"
                    ? "Time off"
                    : item.href === "/employee/attendance"
                      ? "Attendance & punches"
                      : undefined
                }
                className="block min-h-[44px] min-w-[52px] rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-tight text-sky-800 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50 sm:text-xs"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
