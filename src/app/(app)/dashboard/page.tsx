import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, channels, meetings, meetingParticipants, messages } from "@/lib/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import DashboardClient from "./DashboardClient";
import { getUserPresenceStatus } from "@/lib/presence";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  // Get current time in Philippine Timezone (Asia/Manila, GMT+8) for accurate greeting
  const now = new Date();
  const phHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hourCycle: "h23"
  }).format(now);
  const hour = parseInt(phHourStr, 10);
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  // Fetch counts
  const [totalUsersRes, channelCountRes, meetingCountRes, allUsers] = await Promise.all([
    db.select({ count: sql<number>`cast(count(${users.id}) as integer)` }).from(users),
    db.select({ count: sql<number>`cast(count(${channels.id}) as integer)` }).from(channels),
    db.select({ count: sql<number>`cast(count(${meetings.id}) as integer)` }).from(meetings).where(
      and(
        gte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        lte(meetings.endTime, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
      )
    ),
    db.select({ id: users.id }).from(users)
  ]);

  const totalUserCount = totalUsersRes[0]?.count || 0;
  const channelCount = channelCountRes[0]?.count || 0;
  const meetingCount = meetingCountRes[0]?.count || 0;

  // Calculate real initial active users count
  let initialActiveCount = 0;
  allUsers.forEach(u => {
    if (getUserPresenceStatus(u.id) !== "offline") {
      initialActiveCount++;
    }
  });

  // Fetch upcoming meetings for this user
  let upcomingMeetings: any[] = [];
  if (user?.id) {
    const userMeetingIds = (await db.select({ meetingId: meetingParticipants.meetingId })
      .from(meetingParticipants)
      .where(eq(meetingParticipants.userId, user.id))).map(x => x.meetingId);

    if (userMeetingIds.length > 0) {
      upcomingMeetings = await db.query.meetings.findMany({
        where: (m, { and, gte, inArray }) => and(
          gte(m.startTime, now),
          inArray(m.id, userMeetingIds)
        ),
        with: {
          createdBy: { columns: { name: true, avatar: true } },
          participants: { with: { user: { columns: { name: true, avatar: true } } } }
        },
        orderBy: (m, { asc }) => [asc(m.startTime)],
        limit: 3
      });
    }
  }

  // Fetch recent channel messages for activity feed
  const rawRecentMessages = await db.query.messages.findMany({
    with: {
      sender: { columns: { name: true, avatar: true } },
      channel: { columns: { name: true } }
    },
    orderBy: (msg, { desc }) => [desc(msg.createdAt)],
    limit: 5
  });

  const recentMessages = rawRecentMessages.map(m => ({
    id: m.id,
    content: m.content || "",
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    sender: {
      name: m.sender?.name || "Unknown",
      avatar: m.sender?.avatar || undefined
    },
    channel: m.channel ? { name: m.channel.name } : undefined
  }));

  const formattedUpcomingMeetings = upcomingMeetings.map(m => ({
    id: m.id,
    title: m.title,
    startTime: m.startTime ? new Date(m.startTime).toISOString() : new Date().toISOString(),
    participants: m.participants || []
  }));

  return (
    <DashboardClient
      greeting={greeting}
      userName={user?.name || "User"}
      currentUserId={user?.id || ""}
      channelCount={channelCount}
      meetingCount={meetingCount}
      totalUserCount={totalUserCount}
      initialActiveCount={initialActiveCount}
      upcomingMeetings={formattedUpcomingMeetings}
      recentMessages={recentMessages}
    />
  );
}


