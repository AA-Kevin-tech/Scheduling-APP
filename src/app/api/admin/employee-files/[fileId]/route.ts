import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";
import { canAccessManagerRoutes } from "@/lib/auth/roles";
import { employeeOverlapsSchedulingScope } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!canAccessManagerRoutes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fileId } = await context.params;

  const file = await prisma.employeeFile.findUnique({
    where: { id: fileId },
    select: {
      employeeId: true,
      fileName: true,
      contentType: true,
      data: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await employeeOverlapsSchedulingScope(
    session,
    file.employeeId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = new Uint8Array(file.data);
  const type = file.contentType?.trim()
    ? file.contentType
    : "application/octet-stream";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
