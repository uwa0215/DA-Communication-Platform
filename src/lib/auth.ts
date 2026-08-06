import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
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

        // Automatic hash migration: migrate 12 rounds to 10 rounds for 4x faster login
        if (user.password.startsWith("$2a$12$") || user.password.startsWith("$2b$12$")) {
          console.log("🔄 [Auth] Migrating password hash from 12 rounds to 10 rounds...");
          bcrypt.hash(credentials.password as string, 10)
            .then(newHash => {
              prisma.user.update({
                where: { id: user.id },
                data: { password: newHash }
              }).then(() => {
                console.log("✅ [Auth] Password hash migrated successfully.");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.isApproved = (user as any).isApproved;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).isApproved = token.isApproved as boolean;

        // Fetch fresh data so changes like role, avatar, name, and approval update immediately
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, avatar: true, email: true, role: true, isApproved: true },
        });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.email = dbUser.email;
          session.user.image = dbUser.avatar;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).role = dbUser.role;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).isApproved = dbUser.isApproved;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
