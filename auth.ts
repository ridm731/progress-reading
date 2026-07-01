import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAIL;
      if (!allowed) throw new Error("ALLOWED_EMAIL is not set");
      return user.email === allowed;
    },
    session({ session, user }) {
      if (user) session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
});
