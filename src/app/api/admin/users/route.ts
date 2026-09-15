import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserPresenceStatus } from "@/lib/presence";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: No session found" }, { status: 401 });
    }
    const role = (session?.user as any)?.role;
    if (!role || role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: `Unauthorized: User is not an admin` }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        role: true,
        jobTitle: true,
        department: true,
        unit: true,
        isApproved: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
    });

    const liveUsers = users.map(u => ({
      ...u,
      status: getUserPresenceStatus(u.id)
    }));

    return NextResponse.json(liveUsers);
  } catch (error: any) {
    console.error("GET admin users error:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !role || role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, action } = await req.json();

    if (action === "approve") {
      await prisma.user.update({
        where: { id },
        data: { isApproved: true },
      });
    } else if (action === "toggle-role") {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target) {
        const nextRole = target.role === "admin" ? "member" : "admin";
        await prisma.user.update({
          where: { id },
          data: { role: nextRole },
        });
      }
    } else if (action === "reject" || action === "delete") {
      // Prevent admin from deleting their own account
      if (session?.user?.id === id) {
        return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
      }
      try {
        await prisma.$transaction([
          prisma.meetingParticipant.deleteMany({ where: { userId: id } }),
          prisma.meeting.deleteMany({ where: { createdById: id } }),
          prisma.notification.deleteMany({ where: { userId: id } }),
          prisma.dMReaction.deleteMany({ where: { userId: id } }),
          prisma.reaction.deleteMany({ where: { userId: id } }),
          prisma.channelMember.deleteMany({ where: { userId: id } }),
          prisma.message.deleteMany({ where: { senderId: id } }),
          prisma.directMessage.deleteMany({ where: { senderId: id } }),
          prisma.directMessage.deleteMany({ where: { receiverId: id } }),
          prisma.channel.deleteMany({ where: { createdById: id } }),
          prisma.user.delete({ where: { id } }),
        ]);
      } catch (e: any) {
        console.error("Delete user transaction error:", e);
        return NextResponse.json({ error: e.message || "Failed to delete user account" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH admin users error:", error);
    return NextResponse.json({ error: error.message || "Request handling error" }, { status: 500 });
  }
}
