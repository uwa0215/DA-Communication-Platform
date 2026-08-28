import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelMembers, channels } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string, userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id, userId } = await params;
  const currentUserId = session.user.id;

  try {
    const { role } = await req.json(); // "member", "moderator", "admin"

    // Verify current user is admin of the channel
    const currentUserMember = await db.query.channelMembers.findFirst({
      where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, session.user.id))
    });

    if (!currentUserMember || currentUserMember.role !== "admin") {
      return new NextResponse("Forbidden: You must be an admin to change roles.", { status: 403 });
    }

    await db.update(channelMembers)
      .set({ role })
      .where(and(eq(channelMembers.channelId, id), eq(channelMembers.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MEMBER_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id, userId } = await params;

  try {
    // Verify current user is admin or moderator
    const currentUserMember = await db.query.channelMembers.findFirst({
      where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, session.user.id))
    });

    if (!currentUserMember || (currentUserMember.role !== "admin" && currentUserMember.role !== "moderator")) {
      return new NextResponse("Forbidden: You must be an admin or moderator to kick users.", { status: 403 });
    }

    // Admins can't be kicked by moderators
    if (currentUserMember.role === "moderator") {
      const targetMember = await db.query.channelMembers.findFirst({
        where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, userId))
      });
      if (targetMember?.role === "admin" || targetMember?.role === "moderator") {
        return new NextResponse("Forbidden: Moderators cannot kick admins or other moderators.", { status: 403 });
      }
    }

    await db.delete(channelMembers)
      .where(and(eq(channelMembers.channelId, id), eq(channelMembers.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MEMBER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
