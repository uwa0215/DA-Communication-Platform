import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

class PendingApprovalError extends CredentialsSignin {
  code = "pending_approval";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        console.log(`🔐 [Auth] Attempting login for email: ${credentials.email}`);
        const startDb = Date.now();
        const user = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.email, credentials.email as string),
        });
        console.log(`⏱️ [Auth] Database query took: ${Date.now() - startDb}ms`);

        if (!user) {
          console.log("❌ [Auth] User not found in database.");
          return null;
        }

        const startBcrypt = Date.now();
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        console.log(`⏱️ [Auth] Bcrypt comparison took: ${Date.now() - startBcrypt}ms`);

        if (!passwordMatch) {
          console.log("❌ [Auth] Invalid password provided.");
          return null;
        }

        // Automatic hash migration: migrate 10 rounds to 12 rounds for better security
        if (user.password.startsWith("$2a$10$") || user.password.startsWith("$2b$10$")) {
          console.log("🔄 [Auth] Migrating password hash from 10 rounds to 12 rounds for better security...");
          bcrypt.hash(credentials.password as string, 12)
            .then(newHash => {
              db.update(users).set({ password: newHash })
                .where(eq(users.id, user.id))
              .then(() => {
                console.log("✅ [Auth] Password hash migrated successfully to 12 rounds.");
              }).catch((e: any) => console.error("Failed to update migrated password hash:", e));
            })
            .catch((e: any) => console.error("Failed to generate migrated hash:", e));
        }

        if (!user.isApproved) {
          console.log("⚠️ [Auth] Account pending admin approval.");
          throw new PendingApprovalError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role,
          isApproved: user.isApproved,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isApproved = (user as any).isApproved;
        token.name = user.name;
        token.email = user.email;
        // Omit token.image to prevent HTTP 431 Request Header Fields Too Large
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // Omit session.user.image
        (session.user as any).role = token.role as string;
        (session.user as any).isApproved = token.isApproved as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
