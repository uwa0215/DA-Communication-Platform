import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { validatePassword } from "@/lib/passwordValidation";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    const passResult = validatePassword(newPassword);
    if (!passResult.isValid) {
      return NextResponse.json({ error: passResult.errors[0] || "Password does not meet security requirements" }, { status: 400 });
    }

    // Find user with valid token
    const userRecord = await db.query.users.findFirst({
      where: and(
        eq(users.resetToken, token),
        gt(users.resetTokenExpiry, new Date())
      ),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user and clear token
    await db.update(users)
      .set({ 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, userRecord.id));

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
