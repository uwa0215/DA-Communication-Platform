import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/channels/[id]/messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: channelId } = await params;
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const cursor = searchParams.get("cursor");
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: { 
      channelId,
      parentId: parentId || null,
    },
    take: limit,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, avatar: true, status: true } },
      reactions: {
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json({ messages: messages.reverse() });
}

// POST /api/channels/[id]/messages
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: channelId } = await params;
  const { content, fileUrl, fileName, fileType, parentId } = await req.json();

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content: content || "",
      fileUrl,
      fileName,
      fileType,
      senderId: session.user.id,
      channelId,
      parentId: parentId || null,
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true, status: true } },
      reactions: true,
    },
  });

  // Broadcast via Socket.io
  if (global.io) {
    global.io.to(`channel:${channelId}`).emit("new-message", message);
  }

  // Handle Mentions
  const mentionRegex = /data-type="mention"[^>]*data-id="([^"]+)"/g;
  let match;
  const mentionedUserIds = new Set<string>();
  while ((match = mentionRegex.exec(content || "")) !== null) {
    if (match[1] !== session.user.id) {
      mentionedUserIds.add(match[1]);
    }
  }

  for (const userId of mentionedUserIds) {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title: "Mentioned you",
        content: `${message.sender.name} mentioned you in a message`,
        link: `/channels/${channelId}`,
      }
    });
    if (global.io) {
      global.io.to(`user:${userId}`).emit("new-notification", notif);
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
