import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const channel = await prisma.channel.findFirst({
      where: {
        OR: [
          { id: id },
          { name: id }
        ]
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, status: true, jobTitle: true, department: true }
            }
          },
          orderBy: { joinedAt: "asc" }
        }
      }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ channel });
  } catch (error: any) {
    console.error("GET /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, avatar, isPrivate } = await req.json();

    // Check if user is admin or channel creator
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const member = channel.members.find(m => m.userId === userId);
    const isCreator = channel.createdById === userId;
    const isAdmin = (session.user as any).role === "admin" || member?.role === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only admins can edit channel settings" }, { status: 403 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (description !== undefined) dataToUpdate.description = description;
    if (avatar !== undefined) dataToUpdate.avatar = avatar;
    if (isPrivate !== undefined) dataToUpdate.isPrivate = Boolean(isPrivate);

    const updated = await prisma.channel.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ channel: updated });
  } catch (error: any) {
    console.error("PATCH /api/channels/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const channel = await prisma.channel.findUnique({
      where: { id }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const isCreator = channel.createdById === userId;
    const isAdmin = (session.user as any).role === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only the channel creator or global admin can delete this channel" }, { status: 403 });
    }

    await prisma.channel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
