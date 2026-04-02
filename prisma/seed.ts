import {
  type Role,
  HourLimitScope,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: "Guest Services", slug: "guest-services", colorToken: "emerald", sortOrder: 1 },
  { name: "Admissions", slug: "admissions", colorToken: "amber", sortOrder: 2 },
  { name: "Retail", slug: "retail", colorToken: "violet", sortOrder: 3 },
  { name: "Animal Care", slug: "animal-care", colorToken: "teal", sortOrder: 4 },
  { name: "Events", slug: "events", colorToken: "rose", sortOrder: 5 },
  { name: "Maintenance", slug: "maintenance", colorToken: "slate", sortOrder: 6 },
  { name: "Education", slug: "education", colorToken: "sky", sortOrder: 7 },
] as const;

async function main() {
  const plain = process.env.SEED_PASSWORD ?? "changeme";
  const passwordHash = await hash(plain, 12);

  const departments = await Promise.all(
    DEPARTMENTS.map((d) =>
      prisma.department.upsert({
        where: { slug: d.slug },
        create: {
          name: d.name,
          slug: d.slug,
          colorToken: d.colorToken,
          sortOrder: d.sortOrder,
        },
        update: {
          name: d.name,
          colorToken: d.colorToken,
          sortOrder: d.sortOrder,
        },
      }),
    ),
  );

  const bySlug = Object.fromEntries(departments.map((d) => [d.slug, d]));

  const mainLocation = await prisma.location.upsert({
    where: { slug: "austin-aquarium-main" },
    create: {
      name: "Austin Aquarium",
      slug: "austin-aquarium-main",
      address: "Austin, TX",
      sortOrder: 0,
    },
    update: {
      name: "Austin Aquarium",
    },
  });

  const roleRecords: { deptSlug: string; name: string; slug: string }[] = [];
  for (const d of DEPARTMENTS) {
    roleRecords.push(
      { deptSlug: d.slug, name: "Attendant", slug: "attendant" },
      { deptSlug: d.slug, name: "Lead", slug: "lead" },
    );
  }

  const roles: Role[] = [];
  for (const r of roleRecords) {
    const departmentId = bySlug[r.deptSlug].id;
    const existing = await prisma.role.findFirst({
      where: { departmentId, slug: r.slug },
    });
    const row = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: { name: r.name },
        })
      : await prisma.role.create({
          data: { departmentId, name: r.name, slug: r.slug },
        });
    roles.push(row);
  }

  const roleId = (deptSlug: string, roleSlug: string) => {
    const dept = bySlug[deptSlug];
    const r = roles.find(
      (x) => x.departmentId === dept.id && x.slug === roleSlug,
    );
    if (!r) throw new Error(`Role not found: ${deptSlug}/${roleSlug}`);
    return r.id;
  };

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@austin-aquarium.local" },
    create: {
      email: "admin@austin-aquarium.local",
      name: "Admin User",
      role: UserRole.ADMIN,
      passwordHash,
    },
    update: { name: "Admin User", role: UserRole.ADMIN, passwordHash },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@austin-aquarium.local" },
    create: {
      email: "manager@austin-aquarium.local",
      name: "Jamie Manager",
      role: UserRole.MANAGER,
      passwordHash,
    },
    update: { name: "Jamie Manager", role: UserRole.MANAGER, passwordHash },
  });

  const emp1User = await prisma.user.upsert({
    where: { email: "alex@austin-aquarium.local" },
    create: {
      email: "alex@austin-aquarium.local",
      name: "Alex Rivera",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
    update: { name: "Alex Rivera", role: UserRole.EMPLOYEE, passwordHash },
  });

  const emp2User = await prisma.user.upsert({
    where: { email: "sam@austin-aquarium.local" },
    create: {
      email: "sam@austin-aquarium.local",
      name: "Sam Chen",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
    update: { name: "Sam Chen", role: UserRole.EMPLOYEE, passwordHash },
  });

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    create: {
      userId: adminUser.id,
      employeeNumber: "A-1001",
    },
    update: {},
  });

  await prisma.employee.upsert({
    where: { userId: managerUser.id },
    create: {
      userId: managerUser.id,
      employeeNumber: "M-2001",
    },
    update: {},
  });

  const alex = await prisma.employee.upsert({
    where: { userId: emp1User.id },
    create: {
      userId: emp1User.id,
      employeeNumber: "E-3001",
    },
    update: {},
  });

  const sam = await prisma.employee.upsert({
    where: { userId: emp2User.id },
    create: {
      userId: emp2User.id,
      employeeNumber: "E-3002",
    },
    update: {},
  });

  await prisma.employeeDepartment.deleteMany({
    where: { employeeId: { in: [alex.id, sam.id] } },
  });

  await prisma.employeeDepartment.createMany({
    data: [
      {
        employeeId: alex.id,
        departmentId: bySlug["guest-services"].id,
        roleId: roleId("guest-services", "lead"),
        isPrimary: true,
      },
      {
        employeeId: alex.id,
        departmentId: bySlug["admissions"].id,
        roleId: roleId("admissions", "attendant"),
        isPrimary: false,
      },
      {
        employeeId: sam.id,
        departmentId: bySlug["animal-care"].id,
        roleId: roleId("animal-care", "attendant"),
        isPrimary: true,
      },
    ],
  });

  const adminEmp = await prisma.employee.findUniqueOrThrow({
    where: { userId: adminUser.id },
  });
  const managerEmp = await prisma.employee.findUniqueOrThrow({
    where: { userId: managerUser.id },
  });

  await prisma.employeeLocation.deleteMany({
    where: {
      employeeId: { in: [adminEmp.id, managerEmp.id, alex.id, sam.id] },
    },
  });

  await prisma.employeeLocation.createMany({
    data: [adminEmp.id, managerEmp.id, alex.id, sam.id].map((employeeId) => ({
      employeeId,
      locationId: mainLocation.id,
      isPrimary: true,
    })),
  });

  await prisma.hourLimit.deleteMany({
    where: { employeeId: { in: [alex.id, sam.id] } },
  });

  await prisma.hourLimit.createMany({
    data: [
      {
        scope: HourLimitScope.EMPLOYEE,
        employeeId: alex.id,
        weeklyMaxMinutes: 40 * 60,
        dailyMaxMinutes: 12 * 60,
      },
      {
        scope: HourLimitScope.EMPLOYEE,
        employeeId: sam.id,
        weeklyMaxMinutes: 40 * 60,
        dailyMaxMinutes: 12 * 60,
      },
    ],
  });

  await prisma.coverageRule.deleteMany({
    where: { departmentId: bySlug["guest-services"].id },
  });

  await prisma.coverageRule.create({
    data: {
      departmentId: bySlug["guest-services"].id,
      minStaffCount: 2,
      note: "Minimum 2 on guest services floor during open hours",
    },
  });

  // eslint-disable-next-line no-console -- seed script
  console.log("Seed complete. Sample logins (password from SEED_PASSWORD or `changeme`):");
  // eslint-disable-next-line no-console -- seed script
  console.log("  Admin:", adminUser.email);
  // eslint-disable-next-line no-console -- seed script
  console.log("  Manager:", managerUser.email);
  // eslint-disable-next-line no-console -- seed script
  console.log("  Employees:", emp1User.email, emp2User.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
