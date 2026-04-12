import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireItOrPayroll } from "@/lib/auth/guards";

const links = [{ href: "/it-payroll/time-clock", label: "Time clock & geofence" }];

export default async function ItPayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireItOrPayroll();

  return (
    <div className="surface-page min-h-screen lg:flex">
      <aside className="surface-aside border-b lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <span className="font-semibold text-app-heading">IT / Payroll</span>
          <SignOutButton className="lg:mt-4 lg:block" />
        </div>
        <nav className="hidden px-2 pb-4 lg:block" aria-label="IT Payroll">
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
            <li className="pt-2">
              <Link
                href="/admin"
                className="surface-nav-link-accent block rounded-md px-3 py-2 text-sm"
              >
                Admin overview →
              </Link>
            </li>
          </ul>
        </nav>
        <nav
          className="flex gap-2 overflow-x-auto px-2 pb-3 lg:hidden"
          aria-label="IT Payroll mobile"
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
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
