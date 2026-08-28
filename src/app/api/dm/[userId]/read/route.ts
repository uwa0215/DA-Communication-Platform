import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { directMessages } from "@/lib/schema";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherUserId } = await params;
  const myUserId = session.user.id;

  const { eq, and } = require("drizzle-orm");

  await db.update(directMessages)
    .set({ read: true })
    .where(
      and(
        eq(directMessages.receiverId, myUserId),
        eq(directMessages.senderId, otherUserId),
        eq(directMessages.read, false)
      )
    );

  const roomId = [myUserId, otherUserId].sort().join(":");
  
  if (global.io) {
    global.io.to(`dm:${roomId}`).emit("messages-read", { readerId: myUserId });
  }

  return NextResponse.json({ success: true });
}
