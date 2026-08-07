import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { directMessages, notifications } from "@/lib/schema";
import { getCache, setCache, invalidateCachePrefix } from "@/lib/cache";
import { eq, and, or, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

// GET /api/dm/[userId] — get DM conversation
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherId } = await params;
  const myId = session.user.id;
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");

  const roomId = [myId, otherId].sort().join(":");
  const cacheKey = `dm:${roomId}:${parentId || 'root'}`;
  
  const cachedMessages = await getCache(cacheKey);
  if (cachedMessages) {
    return NextResponse.json({ messages: cachedMessages });
  }

  const msgs = await db.query.directMessages.findMany({
    where: (dms, { eq, and, or, isNull }) => 
      and(
        parentId ? eq(dms.parentId, parentId) : isNull(dms.parentId),
        or(
          and(eq(dms.senderId, myId), eq(dms.receiverId, otherId)),
          and(eq(dms.senderId, otherId), eq(dms.receiverId, myId))
        )
      ),
    limit: 100,
    orderBy: (dms, { asc }) => [asc(dms.createdAt)],
    with: {
      sender: { columns: { id: true, name: true, avatar: true, status: true } },
      reactions: { with: { user: { columns: { id: true, name: true } } } },
      replies: { columns: { id: true } }
    },
  });

  const formattedMessages = msgs.map(m => {
    const { replies, ...rest } = m;
    return { ...rest, _count: { replies: replies.length } };
  });

  // Mark unread messages as read
  await db.update(directMessages)
    .set({ read: true })
    .where(and(
      eq(directMessages.senderId, otherId),
      eq(directMessages.receiverId, myId),
      eq(directMessages.read, false)
    ));

  await setCache(cacheKey, formattedMessages, 5); // Cache for 5 seconds

  return NextResponse.json({ messages: formattedMessages });
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

  const [newMessage] = await db.insert(directMessages).values({
    content: content || "",
    fileUrl,
    fileName,
    fileType,
    senderId: myId,
    receiverId,
    parentId: parentId || null,
  }).returning();

  const fullMessage = await db.query.directMessages.findFirst({
    where: (dms, { eq }) => eq(dms.id, newMessage.id),
    with: {
      sender: { columns: { id: true, name: true, avatar: true, status: true } },
      reactions: { with: { user: { columns: { id: true, name: true } } } },
    }
  });

  const broadcastMsg = { ...fullMessage, _count: { replies: 0 } };

  const roomId = [myId, receiverId].sort().join(":");
  await invalidateCachePrefix(`dm:${roomId}`);

  // Broadcast via Socket.io
  if (global.io) {
    global.io.to(`dm:${roomId}`).emit("new-dm", broadcastMsg);
    
    const [notif] = await db.insert(notifications).values({
      userId: receiverId,
      title: "New Message",
      content: `${fullMessage?.sender?.name} sent you a message`,
      link: `/dm/${myId}`,
    }).returning();

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
    const [notif] = await db.insert(notifications).values({
      userId,
      title: "Mentioned you",
      content: `${fullMessage?.sender?.name} mentioned you in a DM`,
      link: `/dm/${myId}`,
    }).returning();

    if (global.io) {
      global.io.to(`user:${userId}`).emit("new-notification", notif);
    }
  }

  return NextResponse.json({ message: broadcastMsg }, { status: 201 });
}

// DELETE /api/dm/[userId] — delete entire DM conversation
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherId } = await params;
  const myId = session.user.id;

  await db.delete(directMessages).where(
    or(
      and(eq(directMessages.senderId, myId), eq(directMessages.receiverId, otherId)),
      and(eq(directMessages.senderId, otherId), eq(directMessages.receiverId, myId))
    )
  );

  const roomId = [myId, otherId].sort().join(":");
  await invalidateCachePrefix(`dm:${roomId}`);

  return NextResponse.json({ success: true });
}

