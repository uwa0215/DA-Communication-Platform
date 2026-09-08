import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!userRecord) {
      // Return success even if user doesn't exist for security reasons
      return NextResponse.json({ message: "If that email is registered, a reset code has been sent." }, { status: 200 });
    }

    // Generate a secure 6-digit OTP
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to DB
    await db.update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, userRecord.id));

    // Strip spaces from Gmail App Password (Google shows it with spaces but must be used without)
    const emailPass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");
    const emailUser = process.env.EMAIL_USER || "";

    const mailOptions = {
      from: `"AGRI COMM Support" <${emailUser}>`,
      to: email,
      subject: "Your Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Password Reset Request</h2>
          <p>You recently requested to reset your password for your AGRI COMM account.</p>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; background-color: #f1f5f9; text-align: center; border-radius: 8px; margin: 20px 0; color: #059669;">
            ${token}
          </div>
          <p>This code is valid for <strong>1 hour</strong>.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // STARTTLS on port 587
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      });
      await transporter.sendMail(mailOptions);
    } else {
      console.log("[AGRI COMM] No email credentials. OTP:", token);
    }

    return NextResponse.json({ message: "Reset code sent! Check your email inbox." }, { status: 200 });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to send reset code. Please try again." }, { status: 500 });
  }
}
