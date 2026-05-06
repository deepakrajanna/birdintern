import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail } from "./users";
import type { Role } from "./types";

declare module "next-auth" {
  interface Session {
    user: {
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    sub?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    /**
     * Reject sign-in for any email not present in the `users` tab with
     * active=true. This is the app's authorization gate.
     */
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      try {
        const user = await getUserByEmail(email);
        if (!user || !user.active) return false;
        return true;
      } catch (e) {
        console.error("[auth] signIn lookup failed:", e);
        return false;
      }
    },

    async jwt({ token, profile }) {
      // First sign-in: profile is present. Look up role and stash on token.
      if (profile?.email) {
        const user = await getUserByEmail(profile.email.toLowerCase());
        if (user) token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as Role) || "intern";
      }
      return session;
    },
  },
};
