import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true } }
          }
        }
      }
    });

    if (!meeting) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const isParticipant = meeting.participants.some(p => p.userId === session.user?.id);
    if (!isParticipant && meeting.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Meetings API GET [id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const participant = await prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: id,
          userId: session.user.id
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 404 });
    }

    const updated = await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Meetings API PATCH Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { createdById: true }
    });

    if (!meeting) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    
    if (meeting.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.meeting.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meetings API DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
