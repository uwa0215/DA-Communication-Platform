import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

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
          where: {
            receiverId: currentUserId,
            read: false
          },
          select: { id: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedUsers = distinctUsers.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      status: u.status,
      jobTitle: u.jobTitle,
      unreadCount: u.sentDMs.length,
    }));

    await setCache(cacheKey, formattedUsers, 5);

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Failed to fetch active DM users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
