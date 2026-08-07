import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, channels, channelMembers } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, jobTitle, department, unit } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ 
      where: eq(users.email, email) 
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const countResult = await db.select({ value: count() }).from(users);
    const userCount = countResult[0].value;
    const isFirstUser = userCount === 0;

    const insertedUsers = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      jobTitle: jobTitle || null,
      department: department || null,
      unit: unit || null,
      role: isFirstUser ? "admin" : "member",
      isApproved: isFirstUser ? true : false,
      updatedAt: new Date(),
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isApproved: users.isApproved,
      createdAt: users.createdAt
    });

    const user = insertedUsers[0];

    // Auto-join the "general" channel
    const general = await db.query.channels.findFirst({ 
      where: eq(channels.name, "general") 
    });
    
    if (general) {
      await db.insert(channelMembers).values({
        channelId: general.id,
        userId: user.id
      });
    }

    console.log("REGISTER RESPONSE USER:", user);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
