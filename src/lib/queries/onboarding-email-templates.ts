import { prisma } from "@/lib/db";

export async function listOnboardingEmailTemplateSummaries() {
  return prisma.onboardingEmailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      subject: true,
      updatedAt: true,
    },
  });
}

export async function getOnboardingEmailTemplateById(id: string) {
  return prisma.onboardingEmailTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      subject: true,
      htmlBody: true,
      updatedAt: true,
    },
  });
}
