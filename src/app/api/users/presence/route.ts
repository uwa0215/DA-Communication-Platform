import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// PATCH /api/users/presence — update online status
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  const validStatuses = ["online", "away", "offline"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db.update(users).set({ status }).where(eq(users.id, session.user.id));

  const userStatuses = (global as any).userStatuses as Map<string, string> | undefined;
  if (userStatuses) {
    userStatuses.set(session.user.id, status);
  }

  // Broadcast to all connected clients
  if ((global as any).io) {
    (global as any).io.emit("user-presence", { userId: session.user.id, status });
  }

  return NextResponse.json({ ok: true });
}
