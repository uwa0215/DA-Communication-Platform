import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: No session found" }, { status: 401 });
    }
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: `Unauthorized: User is not an admin (Current role in session: "${role || 'none'}")` }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isApproved: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("GET admin users error:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session?.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, action } = await req.json();

    if (action === "approve") {
      await prisma.user.update({
        where: { id },
        data: { isApproved: true },
      });
    } else if (action === "reject" || action === "delete") {
      // Prevent admin from deleting themselves
      if (session?.user?.id === id) {
        return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
      }
      try {
        await prisma.$transaction([
          prisma.channelMember.deleteMany({ where: { userId: id } }),
          prisma.message.deleteMany({ where: { senderId: id } }),
          prisma.reaction.deleteMany({ where: { userId: id } }),
          prisma.directMessage.deleteMany({ where: { senderId: id } }),
          prisma.directMessage.deleteMany({ where: { receiverId: id } }),
          prisma.channel.deleteMany({ where: { createdById: id } }),
          prisma.user.delete({ where: { id } }),
        ]);
      } catch (e: any) {
        console.error("Delete user transaction error:", e);
        return NextResponse.json({ error: e.message || "Database transaction error" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH admin users error:", error);
    return NextResponse.json({ error: error.message || "Request handling error" }, { status: 500 });
  }
}
