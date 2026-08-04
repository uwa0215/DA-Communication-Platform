import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/channels/[id]/group
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, avatar, userIdsToAdd } = await req.json();
  const { id: channelId } = await params;

  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });

    if (!channel || !channel.isGroup) {
      return NextResponse.json({ error: "Group chat not found" }, { status: 404 });
    }

    const isMember = channel.members.some(m => m.userId === session?.user?.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Update members if provided
    if (userIdsToAdd && Array.isArray(userIdsToAdd) && userIdsToAdd.length > 0) {
      // Filter out users who are already members
      const existingUserIds = channel.members.map(m => m.userId);
      const newUsers = userIdsToAdd.filter(id => !existingUserIds.includes(id));
      
      if (newUsers.length > 0) {
        await prisma.channelMember.createMany({
          data: newUsers.map(userId => ({
            channelId,
            userId,
          })),
        });
      }
    }

    // Update name and avatar
    const updateData: any = {};
    if (name) updateData.name = `${name}##${Date.now()}`;
    if (avatar !== undefined) updateData.avatar = avatar; // Allow null to remove avatar

    let updatedChannel = channel;
    if (Object.keys(updateData).length > 0) {
      updatedChannel = await prisma.channel.update({
        where: { id: channelId },
        data: updateData,
        include: { members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } } },
      }) as any;
    } else {
      updatedChannel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } } },
      }) as any;
    }

    return NextResponse.json({ channel: updatedChannel });
  } catch (error) {
    console.error("Group update error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
