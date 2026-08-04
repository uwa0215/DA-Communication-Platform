import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/channels — list all channels user is member of + all public channels
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { isPrivate: false },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ channels });
}

// POST /api/channels — create a new channel or group chat
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, isPrivate, isGroup, avatar } = await req.json();

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // For standard channels, enforce slug and uniqueness manually
  let finalName = name;
  if (!isGroup) {
    finalName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await prisma.channel.findFirst({ where: { name: finalName, isGroup: false } });
    if (existing) return NextResponse.json({ error: "Channel name already exists" }, { status: 400 });
  } else {
    // For group chats, bypass SQLite's stubborn unique constraint on name by appending a unique ID
    finalName = `${name}##${Date.now()}`;
  }

  try {
    const channel = await prisma.channel.create({
      data: {
        name: finalName,
        description,
        isPrivate: isPrivate || false,
        isGroup: isGroup || false,
        avatar: avatar || null,
        createdById: session.user.id,
        members: { create: { userId: session.user.id } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } },
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Channel name already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
