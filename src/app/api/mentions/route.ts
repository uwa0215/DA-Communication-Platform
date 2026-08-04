import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const mentionString = `data-id="${session.user.id}"`;

    const channelMessages = await prisma.message.findMany({
      where: {
        content: { contains: mentionString },
        channel: {
          members: { some: { userId: session.user.id } }
        }
      },
      include: {
        channel: { select: { id: true, name: true } },
        sender: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const directMessages = await prisma.directMessage.findMany({
      where: {
        content: { contains: mentionString },
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const allMentions = [
      ...channelMessages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        type: 'channel',
        sender: m.sender,
        channel: m.channel,
        link: `/channels/${m.channel.name}`
      })),
      ...directMessages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        type: 'dm',
        sender: m.sender,
        otherUser: m.sender.id === session?.user?.id ? m.receiver : m.sender,
        link: `/dm/${m.sender.id === session?.user?.id ? m.receiver.id : m.sender.id}`
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ mentions: allMentions });
  } catch (error) {
    console.error("Mentions API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
