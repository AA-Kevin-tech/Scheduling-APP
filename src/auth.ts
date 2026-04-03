import type { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [{ prisma }, { compare }] = await Promise.all([
          import("@/lib/db"),
          import("bcryptjs"),
        ]);

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            credentialVersion: true,
            employee: { select: { id: true } },
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as UserRole,
          employeeId: user.employee?.id,
          credentialVersion: user.credentialVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.credentialVersion = user.credentialVersion ?? 0;
        return token;
      }
      if (token.sub) {
        try {
          const { prisma } = await import("@/lib/db");
          const row = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { credentialVersion: true },
          });
          const tv =
            typeof token.credentialVersion === "number"
              ? token.credentialVersion
              : 0;
          if (!row || row.credentialVersion !== tv) {
            return null;
          }
        } catch {
          // DB down or schema not migrated yet — do not throw from jwt (would 500 every request).
          return token;
        }
      }
      return token;
    },
  },
});
