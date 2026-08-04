import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ users: [], channels: [], messages: [] });
  }

  const query = q.trim();

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { jobTitle: { contains: query } },
        ]
      },
      select: { id: true, name: true, email: true, avatar: true, jobTitle: true, status: true },
      take: 10
    });

    const channels = await prisma.channel.findMany({
      where: {
        name: { contains: query }
      },
      select: { id: true, name: true, isPrivate: true },
      take: 10
    });

    const channelMessages = await prisma.message.findMany({
      where: {
        content: { contains: query },
        channel: {
          members: { some: { userId: session.user.id } }
        }
      },
      include: {
        channel: { select: { id: true, name: true } },
        sender: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const directMessages = await prisma.directMessage.findMany({
      where: {
        content: { contains: query },
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
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
      ...directMessages.map(m => ({
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
      users,
      channels,
      messages: allMessages
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
