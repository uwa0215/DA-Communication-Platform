import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";
import { getUserPresenceStatus } from "@/lib/presence";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserId = session.user.id;
  const cacheKey = `dms_users_${currentUserId}`;

  try {
    const cachedUsers = await getCache(cacheKey);
    if (cachedUsers) {
      return NextResponse.json({ users: cachedUsers });
    }

    // Efficiently find users who have exchanged DMs with the current user
    const distinctUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { sentDMs: { some: { receiverId: currentUserId } } },
          { receivedDMs: { some: { senderId: currentUserId } } }
        ]
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        status: true,
        jobTitle: true,
        sentDMs: {
          where: { receiverId: currentUserId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, read: true, createdAt: true }
        },
        receivedDMs: {
          where: { senderId: currentUserId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    const formattedUsers = distinctUsers.map(u => {
      const unreadCount = u.sentDMs.filter(m => !m.read).length;
      const latestSent = u.sentDMs[0]?.createdAt ? new Date(u.sentDMs[0].createdAt).getTime() : 0;
      const latestReceived = u.receivedDMs[0]?.createdAt ? new Date(u.receivedDMs[0].createdAt).getTime() : 0;
      const lastMessageAt = Math.max(latestSent, latestReceived);

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        status: getUserPresenceStatus(u.id),
        jobTitle: u.jobTitle,
        unreadCount,
        lastMessageAt,
      };
    });

    // Sort: Unread first, then by most recent message timestamp descending
    formattedUsers.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      if (a.unreadCount > 0 && b.unreadCount > 0) {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      }
      return b.lastMessageAt - a.lastMessageAt;
    });

    await setCache(cacheKey, formattedUsers, 5);

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Failed to fetch active DM users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
