import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserId = session.user.id;

  try {
    // Find all DMs where the user is sender or receiver
    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId }
        ]
      },
      select: {
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
            jobTitle: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
            jobTitle: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Extract unique users
    const userMap = new Map();

    for (const dm of dms) {
      if (dm.senderId !== currentUserId && !userMap.has(dm.senderId)) {
        userMap.set(dm.senderId, dm.sender);
      }
      if (dm.receiverId !== currentUserId && !userMap.has(dm.receiverId)) {
        userMap.set(dm.receiverId, dm.receiver);
      }
    }

    return NextResponse.json({ users: Array.from(userMap.values()) });
  } catch (error) {
    console.error("Failed to fetch active DM users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
