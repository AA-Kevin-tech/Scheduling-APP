import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/schedule", label: "Schedule" },
  { href: "/manager/employees", label: "Employees" },
  { href: "/manager/coverage", label: "Coverage" },
  { href: "/manager/swaps", label: "Swaps" },
  { href: "/manager/audit", label: "Audit" },
  { href: "/manager/departments", label: "Departments" },
  { href: "/manager/settings", label: "Settings" },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <span className="font-semibold text-slate-900">Manager</span>
          <SignOutButton className="lg:mt-4 lg:block" />
        </div>
        <nav className="hidden px-2 pb-4 lg:block" aria-label="Manager">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav
          className="flex gap-2 overflow-x-auto px-2 pb-3 lg:hidden"
          aria-label="Manager mobile"
        >
          {links.slice(0, 4).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
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
