import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { userIds } = await req.json(); // array of user IDs to add

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 });
    }

    const channel = await prisma.channel.findUnique({
      where: { id }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Add users to channel member table
    const createData = userIds.map((uId: string) => ({
      channelId: id,
      userId: uId,
      role: "member"
    }));

    await prisma.channelMember.createMany({
      data: createData,
      skipDuplicates: true
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/channels/[id]/members error:", error);
    return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
  }
}
