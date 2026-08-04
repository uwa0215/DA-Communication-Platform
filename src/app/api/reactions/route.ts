import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/reactions — toggle emoji reaction
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, emoji, type } = await req.json();
  const isDm = type === "dm";

  let reactions = [];

  if (isDm) {
    const existing = await prisma.dMReaction.findUnique({
      where: { userId_directMessageId_emoji: { userId: session.user.id, directMessageId: messageId, emoji } },
    });

    if (existing) {
      await prisma.dMReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.dMReaction.create({
        data: { emoji, userId: session.user.id, directMessageId: messageId },
      });
    }

    reactions = await prisma.dMReaction.findMany({
      where: { directMessageId: messageId },
      include: { user: { select: { id: true, name: true } } },
    });
  } else {
    const existing = await prisma.reaction.findUnique({
      where: { userId_messageId_emoji: { userId: session.user.id, messageId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { emoji, userId: session.user.id, messageId },
      });
    }

    reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  if (global.io) {
    global.io.emit("reaction-update", { messageId, reactions });
  }

  return NextResponse.json({ reactions });
}
