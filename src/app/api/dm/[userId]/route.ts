import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/dm/[userId] — get DM conversation
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherId } = await params;
  const myId = session.user.id;
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");

  const messages = await prisma.directMessage.findMany({
    where: {
      parentId: parentId || null,
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true, status: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Mark unread messages as read
  await prisma.directMessage.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ messages });
}

// POST /api/dm/[userId] — send DM
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: receiverId } = await params;
  const myId = session.user.id;
  const { content, fileUrl, fileName, fileType, parentId } = await req.json();

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const message = await prisma.directMessage.create({
    data: {
      content: content || "",
      fileUrl,
      fileName,
      fileType,
      senderId: myId,
      receiverId,
      parentId: parentId || null,
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true, status: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Broadcast via Socket.io
  const roomId = [myId, receiverId].sort().join(":");
  if (global.io) {
    global.io.to(`dm:${roomId}`).emit("new-dm", message);
    
    const notif = await prisma.notification.create({
      data: {
        userId: receiverId,
        title: "New Message",
        content: `${message.sender.name} sent you a message`,
        link: `/dm/${myId}`,
      }
    });

    global.io.to(`user:${receiverId}`).emit("new-notification", notif);
  }

  // Handle Mentions
  const mentionRegex = /data-type="mention"[^>]*data-id="([^"]+)"/g;
  let match;
  const mentionedUserIds = new Set<string>();
  while ((match = mentionRegex.exec(content || "")) !== null) {
    if (match[1] !== myId && match[1] !== receiverId) { // Prevent duplicate notification for receiver
      mentionedUserIds.add(match[1]);
    }
  }

  for (const userId of mentionedUserIds) {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title: "Mentioned you",
        content: `${message.sender.name} mentioned you in a DM`,
        link: `/dm/${myId}`, // Usually mentions in DMs aren't standard, but supported
      }
    });
    if (global.io) {
      global.io.to(`user:${userId}`).emit("new-notification", notif);
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}

// DELETE /api/dm/[userId] — delete entire DM conversation
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherId } = await params;
  const myId = session.user.id;

  await prisma.directMessage.deleteMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    },
  });

  return NextResponse.json({ success: true });
}

