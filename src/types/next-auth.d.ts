import type { DefaultSession } from "next-auth";
import type { AdminRole } from "@/types";

declare module "next-auth" {
  interface User {
    role?: AdminRole;
  }
  interface Session {
    user: { id: string; role: AdminRole } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: AdminRole;
  }
}
