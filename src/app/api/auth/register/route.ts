import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, jobTitle, department, unit } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        jobTitle: jobTitle || null,
        department: department || null,
        unit: unit || null,
        role: isFirstUser ? "admin" : "member",
        isApproved: isFirstUser ? true : false,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Auto-join the "general" channel
    const general = await prisma.channel.findFirst({ where: { name: "general" } });
    if (general) {
      await prisma.channelMember.create({
        data: { channelId: general.id, userId: user.id },
      });
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
