import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireManager() {
  const session = await requireSession();
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect("/employee");
  }
  return session;
}

export async function requireEmployeeProfile() {
  const session = await requireSession();
  const employeeId = session.user.employeeId;
  if (!employeeId) {
    if (session.user.role === "MANAGER" || session.user.role === "ADMIN") {
      redirect("/manager");
    }
    redirect("/login");
  }
  return { session, employeeId };
}
