import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, type } = await req.json();
    const params = await props.params;
    const messageId = params.id;

    if (type === 'dm') {
      const existing = await prisma.directMessage.findUnique({ where: { id: messageId } });
      if (!existing || existing.senderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { content, edited: true } as any,
        include: { sender: { select: { id: true, name: true, avatar: true } } }
      });
      
      const roomId = [existing.senderId, existing.receiverId].sort().join(":");
      if ((global as any).io) {
        (global as any).io.to(`dm:${roomId}`).emit("message-updated", updated);
      }
      return NextResponse.json(updated);
    } else {
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing || existing.senderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, edited: true },
        include: { sender: { select: { id: true, name: true, avatar: true } } }
      });

      if ((global as any).io) {
        (global as any).io.to(`channel:${existing.channelId}`).emit("message-updated", updated);
      }
      return NextResponse.json(updated);
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const params = await props.params;
    const messageId = params.id;

    if (type === 'dm') {
      const existing = await prisma.directMessage.findUnique({ where: { id: messageId } });
      if (!existing || existing.senderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { isDeleted: true },
        include: { sender: { select: { id: true, name: true, avatar: true } } }
      });

      const roomId = [existing.senderId, existing.receiverId].sort().join(":");
      if ((global as any).io) {
        (global as any).io.to(`dm:${roomId}`).emit("message-deleted", updated);
      }
      return NextResponse.json(updated);
    } else {
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      let canDelete = existing.senderId === session.user.id;

      if (!canDelete) {
        const member = await prisma.channelMember.findUnique({
          where: { channelId_userId: { channelId: existing.channelId, userId: session.user.id } }
        });
        if (member && (member.role === "admin" || member.role === "moderator")) {
          canDelete = true;
        }
      }

      if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true },
        include: { sender: { select: { id: true, name: true, avatar: true } } }
      });

      if ((global as any).io) {
        (global as any).io.to(`channel:${existing.channelId}`).emit("message-deleted", updated);
      }
      return NextResponse.json(updated);
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
