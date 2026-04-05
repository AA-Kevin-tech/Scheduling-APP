import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

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

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    redirect("/manager");
  }
  return session;
}

/** Admin or manager (for user provisioning, etc.). */
export async function requireAdminOrManager() {
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
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { archivedAt: true },
  });
  if (emp?.archivedAt) {
    redirect("/employee/account-archived");
  }
  return { session, employeeId };
}
