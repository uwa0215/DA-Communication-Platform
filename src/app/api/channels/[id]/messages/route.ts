import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages as messagesSchema, notifications } from "@/lib/schema";
import { getCache, setCache, invalidateCachePrefix } from "@/lib/cache";
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

  const cacheKey = `channel:${channelId}:messages:${parentId || 'root'}:${cursor || 'latest'}`;
  const cachedMessages = await getCache(cacheKey);
  if (cachedMessages) {
    return NextResponse.json({ messages: cachedMessages });
  }

  const msgs = await db.query.messages.findMany({
    where: (messages, { eq, and, isNull }) => 
      parentId 
        ? and(eq(messages.channelId, channelId), eq(messages.parentId, parentId))
        : and(eq(messages.channelId, channelId), isNull(messages.parentId)),
    limit: 50,
    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    with: {
      sender: {
        columns: { id: true, name: true, avatar: true, status: true }
      },
      reactions: {
        with: { user: { columns: { id: true, name: true } } }
      },
      replies: { columns: { id: true } }
    },
  });

  const formattedMessages = msgs.map(m => {
    const { replies, ...rest } = m;
    return { ...rest, _count: { replies: replies.length } };
  });

  const responseMessages = formattedMessages.reverse();
  await setCache(cacheKey, responseMessages, 5); // Cache for 5 seconds

  return NextResponse.json({ messages: responseMessages });
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

  const [newMessage] = await db.insert(messagesSchema).values({
    content: content || "",
    fileUrl,
    fileName,
    fileType,
    senderId: session.user.id,
    channelId,
    parentId: parentId || null,
  }).returning();

  const fullMessage = await db.query.messages.findFirst({
    where: (messages, { eq }) => eq(messages.id, newMessage.id),
    with: {
      sender: { columns: { id: true, name: true, avatar: true, status: true } },
      reactions: { with: { user: { columns: { id: true, name: true } } } },
    }
  });

  const broadcastMsg = { ...fullMessage, _count: { replies: 0 } };

  // Invalidate cache
  await invalidateCachePrefix(`channel:${channelId}:messages`);

  // Broadcast via Socket.io
  if (global.io) {
    global.io.to(`channel:${channelId}`).emit("new-message", broadcastMsg);
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
    const [notif] = await db.insert(notifications).values({
      userId,
      title: "Mentioned you",
      content: `${fullMessage?.sender?.name} mentioned you in a message`,
      link: `/channels/${channelId}`,
    }).returning();
    
    if (global.io) {
      global.io.to(`user:${userId}`).emit("new-notification", notif);
    }
  }

  return NextResponse.json({ message: broadcastMsg }, { status: 201 });
}
