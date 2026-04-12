import type { ThemePreference, UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      employeeId?: string;
      themePreference: ThemePreference;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    employeeId?: string;
    credentialVersion?: number;
    themePreference?: ThemePreference;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    employeeId?: string;
    credentialVersion?: number;
    themePreference?: ThemePreference;
  }
}
