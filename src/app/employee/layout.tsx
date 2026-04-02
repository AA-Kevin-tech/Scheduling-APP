import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const nav = [
  { href: "/employee", label: "Home" },
  { href: "/employee/schedule", label: "Schedule" },
  { href: "/employee/availability", label: "Availability" },
  { href: "/employee/swaps", label: "Swaps" },
  { href: "/employee/profile", label: "Profile" },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Aquarium</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>
      <nav
        className="sticky bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
        aria-label="Employee"
      >
        <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-sky-800 hover:bg-sky-50"
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
