import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { channels, channelMembers } from "@/lib/schema";
import { eq, or, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCache, setCache, invalidateCachePrefix } from "@/lib/cache";

// GET /api/channels — list all channels user is member of + all public channels
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cacheKey = `channels_${session.user.id}`;
  const cachedChannels = await getCache(cacheKey);
  if (cachedChannels) {
    return NextResponse.json({ channels: cachedChannels });
  }

  // Find channels where isPrivate=false OR user is a member
  // Using query API with a relational trick or just a subquery
  const userChannelIds = (await db.select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .where(eq(channelMembers.userId, session.user.id))).map(c => c.channelId);

  const channelsData = await db.query.channels.findMany({
    where: (ch, { or, eq, inArray }) => 
      userChannelIds.length > 0 
        ? or(eq(ch.isPrivate, false), inArray(ch.id, userChannelIds))
        : eq(ch.isPrivate, false),
    with: {
      members: { with: { user: { columns: { id: true, name: true, avatar: true, status: true } } } },
    },
    orderBy: (ch, { asc }) => [asc(ch.name)],
  });

  await setCache(cacheKey, channelsData, 60);

  return NextResponse.json({ channels: channelsData });
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
    const existing = await db.query.channels.findFirst({ where: (ch, { eq, and }) => and(eq(ch.name, finalName), eq(ch.isGroup, false)) });
    if (existing) return NextResponse.json({ error: "Channel name already exists" }, { status: 400 });
  } else {
    // For group chats, bypass SQLite's stubborn unique constraint on name by appending a unique ID
    finalName = `${name}##${Date.now()}`;
  }

  try {
    const [channel] = await db.insert(channels).values({
      name: finalName,
      description,
      isPrivate: isPrivate || false,
      isGroup: isGroup || false,
      avatar: avatar || null,
      createdById: session.user.id,
    }).returning();

    await db.insert(channelMembers).values({
      channelId: channel.id,
      userId: session.user.id,
    });

    const createdChannel = await db.query.channels.findFirst({
      where: (ch, { eq }) => eq(ch.id, channel.id),
      with: {
        members: { with: { user: { columns: { id: true, name: true, avatar: true, status: true } } } },
      }
    });

    await invalidateCachePrefix('channels_');

    return NextResponse.json({ channel: createdChannel }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.code === "23505") { // Postgres unique constraint violation
      return NextResponse.json({ error: "Channel name already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
