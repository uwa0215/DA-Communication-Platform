import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("start");
    const endDateParam = url.searchParams.get("end");

    const whereClause: any = {
      participants: {
        some: { userId: session.user.id }
      }
    };

    if (startDateParam && endDateParam) {
      whereClause.startTime = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam)
      };
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Meetings API GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, description, startTime, endTime, participantIds } = await req.json();

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Include the creator as a participant automatically, with 'accepted' status
    const allParticipants = new Set(participantIds || []);
    allParticipants.add(session.user.id);

    // Generate a unique Jitsi Meet link
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const randomId = Math.random().toString(36).substring(2, 10);
    const meetLink = `https://meet.jit.si/companychat-${sanitizedTitle}-${randomId}`;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetLink,
        createdById: session.user.id,
        participants: {
          create: Array.from(allParticipants).map((userId: any) => ({
            userId,
            status: userId === session.user.id ? "accepted" : "pending"
          }))
        }
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Meetings API POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
