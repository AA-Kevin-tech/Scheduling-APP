import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    }
    if (session.user.role === "MANAGER") {
      redirect("/manager");
    }
    redirect("/employee");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-slate-100 px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Austin Aquarium Scheduling
        </h1>
        <p className="mt-3 text-slate-600">
          Sign in to view your schedule, request swaps, and manage coverage.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
