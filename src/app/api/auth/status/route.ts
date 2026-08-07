import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { isApproved: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ isApproved: user.isApproved });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
