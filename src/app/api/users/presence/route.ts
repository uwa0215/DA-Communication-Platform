import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { status },
  });

  // Broadcast to all connected clients
  if (global.io) {
    global.io.emit("user-presence", { userId: session.user.id, status });
  }

  return NextResponse.json({ ok: true });
}
