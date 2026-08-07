import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, channels, messages, directMessages, channelMembers } from "@/lib/schema";
import { eq, or, and, ilike, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ users: [], channels: [], messages: [] });
  }

  const userId = session.user.id as string;
  const query = q.trim();

  try {
    const usersData = await db.query.users.findMany({
      where: (u, { or, ilike }) => or(
        ilike(u.name, `%${query}%`),
        ilike(u.email, `%${query}%`),
        ilike(u.jobTitle, `%${query}%`)
      ),
      columns: { id: true, name: true, email: true, avatar: true, jobTitle: true, status: true },
      limit: 10
    });

    const channelsData = await db.query.channels.findMany({
      where: (c, { ilike }) => ilike(c.name, `%${query}%`),
      columns: { id: true, name: true, isPrivate: true },
      limit: 10
    });

    const userChannelIds = (await db.select({ channelId: channelMembers.channelId })
      .from(channelMembers)
      .where(eq(channelMembers.userId, userId))).map(c => c.channelId);

    const channelMessages = userChannelIds.length > 0 ? await db.query.messages.findMany({
      where: (m, { ilike, and, inArray }) => and(
        ilike(m.content, `%${query}%`),
        inArray(m.channelId, userChannelIds)
      ),
      with: {
        channel: { columns: { id: true, name: true } },
        sender: { columns: { id: true, name: true } }
      },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 10
    }) : [];

    const directMessagesData = await db.query.directMessages.findMany({
      where: (m, { ilike, or, eq, and }) => and(
        ilike(m.content, `%${query}%`),
        or(eq(m.senderId, userId), eq(m.receiverId, userId))
      ),
      with: {
        sender: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } }
      },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 10
    });

    // Combine channel & direct messages and sort
    const allMessages = [
      ...channelMessages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        type: 'channel',
        sender: m.sender,
        channel: m.channel,
      })),
      ...directMessagesData.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        type: 'dm',
        sender: m.sender,
        otherUser: m.sender.id === session?.user?.id ? m.receiver : m.sender
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, 15);

    return NextResponse.json({
      users: usersData,
      channels: channelsData,
      messages: allMessages
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
