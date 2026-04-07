import {
  type Role,
  HourLimitScope,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/** Plan §7: `SEED_PASSWORD` or `SEED_ADMIN_PASSWORD` (same value for all seeded users except admin). */
function seedPasswordPlain(): string {
  return (
    process.env.SEED_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    "changeme"
  );
}

/** Admin user only. Override with `SEED_ADMIN_ACCOUNT_PASSWORD` in `.env`. */
function seedAdminPasswordPlain(): string {
  return process.env.SEED_ADMIN_ACCOUNT_PASSWORD ?? "Bb3304917";
}

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
  const plain = seedPasswordPlain();
  const passwordHash = await hash(plain, 12);
  const adminPasswordHash = await hash(seedAdminPasswordPlain(), 12);

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
    where: { slug: "main" },
    create: {
      name: "Main location",
      slug: "main",
      address: "Local",
      sortOrder: 0,
    },
    update: {
      name: "Main location",
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

  const guestZones = [
    { name: "Main floor", slug: "main-floor" },
    { name: "Lobby / admissions desk", slug: "lobby" },
  ] as const;
  for (const z of guestZones) {
    await prisma.departmentZone.upsert({
      where: {
        departmentId_slug: {
          departmentId: bySlug["guest-services"].id,
          slug: z.slug,
        },
      },
      create: {
        departmentId: bySlug["guest-services"].id,
        name: z.name,
        slug: z.slug,
      },
      update: { name: z.name },
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@seed.local" },
    create: {
      email: "admin@seed.local",
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
    },
    update: {
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@seed.local" },
    create: {
      email: "manager@seed.local",
      firstName: "Jamie",
      lastName: "Manager",
      name: "Jamie Manager",
      role: UserRole.MANAGER,
      passwordHash,
    },
    update: {
      firstName: "Jamie",
      lastName: "Manager",
      name: "Jamie Manager",
      role: UserRole.MANAGER,
      passwordHash,
    },
  });

  const emp1User = await prisma.user.upsert({
    where: { email: "alex@seed.local" },
    create: {
      email: "alex@seed.local",
      firstName: "Alex",
      lastName: "Rivera",
      name: "Alex Rivera",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
    update: {
      firstName: "Alex",
      lastName: "Rivera",
      name: "Alex Rivera",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
  });

  const emp2User = await prisma.user.upsert({
    where: { email: "sam@seed.local" },
    create: {
      email: "sam@seed.local",
      firstName: "Sam",
      lastName: "Chen",
      name: "Sam Chen",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
    update: {
      firstName: "Sam",
      lastName: "Chen",
      name: "Sam Chen",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
  });

  const emp3User = await prisma.user.upsert({
    where: { email: "jordan@seed.local" },
    create: {
      email: "jordan@seed.local",
      firstName: "Jordan",
      lastName: "Lee",
      name: "Jordan Lee",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
    update: {
      firstName: "Jordan",
      lastName: "Lee",
      name: "Jordan Lee",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
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

  const jordan = await prisma.employee.upsert({
    where: { userId: emp3User.id },
    create: {
      userId: emp3User.id,
      employeeNumber: "E-3003",
    },
    update: {},
  });

  await prisma.employeeDepartment.deleteMany({
    where: { employeeId: { in: [alex.id, sam.id, jordan.id] } },
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
      {
        employeeId: jordan.id,
        departmentId: bySlug["education"].id,
        roleId: roleId("education", "lead"),
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
      employeeId: {
        in: [adminEmp.id, managerEmp.id, alex.id, sam.id, jordan.id],
      },
    },
  });

  await prisma.employeeLocation.createMany({
    data: [adminEmp.id, managerEmp.id, alex.id, sam.id, jordan.id].map(
      (employeeId) => ({
        employeeId,
        locationId: mainLocation.id,
        isPrimary: true,
      }),
    ),
  });

  const retailAttendantRoleId = roleId("retail", "attendant");
  await prisma.hourLimit.deleteMany({
    where: {
      OR: [
        { employeeId: { in: [alex.id, sam.id, jordan.id] } },
        {
          scope: HourLimitScope.DEPARTMENT_ROLE,
          departmentId: bySlug["retail"].id,
          roleId: retailAttendantRoleId,
        },
      ],
    },
  });

  await prisma.hourLimit.createMany({
    data: [
      {
        scope: HourLimitScope.EMPLOYEE,
        employeeId: alex.id,
        weeklyMaxMinutes: 40 * 60,
      },
      {
        scope: HourLimitScope.EMPLOYEE,
        employeeId: sam.id,
        weeklyMaxMinutes: 40 * 60,
      },
      {
        scope: HourLimitScope.EMPLOYEE,
        employeeId: jordan.id,
        weeklyMaxMinutes: 30 * 60,
      },
      {
        scope: HourLimitScope.DEPARTMENT_ROLE,
        departmentId: bySlug["retail"].id,
        roleId: retailAttendantRoleId,
        weeklyMaxMinutes: 24 * 60,
      },
    ],
  });

  await prisma.coverageRule.deleteMany({
    where: {
      departmentId: {
        in: [bySlug["guest-services"].id, bySlug["admissions"].id],
      },
    },
  });

  await prisma.coverageRule.createMany({
    data: [
      {
        departmentId: bySlug["guest-services"].id,
        minStaffCount: 2,
        note: "Minimum 2 on guest services floor during open hours",
      },
      {
        departmentId: bySlug["admissions"].id,
        minStaffCount: 1,
        note: "At least one admissions desk during open hours",
      },
    ],
  });

  console.log(
    "Seed complete. Admin password: SEED_ADMIN_ACCOUNT_PASSWORD or default; other users: SEED_PASSWORD or SEED_ADMIN_PASSWORD, else `changeme`",
  );
  console.log("  Admin:", adminUser.email);
  console.log("  Manager:", managerUser.email);
  console.log(
    "  Employees:",
    emp1User.email,
    "(multi-dept),",
    emp2User.email,
    ",",
    emp3User.email,
    "(single-dept)",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
