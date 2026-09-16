import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, channels, meetings, meetingParticipants, messages } from "@/lib/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import DashboardClient from "./DashboardClient";
import { getUserPresenceStatus } from "@/lib/presence";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  // Safe time calculation in Philippine Timezone
  const now = new Date();
  let hour = now.getHours();
  try {
    const phHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false
    }).format(now);
    hour = parseInt(phHourStr, 10) || now.getHours();
  } catch (e) {
    hour = now.getHours();
  }

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  let totalUserCount = 0;
  let channelCount = 0;
  let meetingCount = 0;
  let initialActiveCount = 0;
  let recentMessages: any[] = [];
  let formattedUpcomingMeetings: any[] = [];

  try {
    const [totalUsersRes, channelCountRes, meetingCountRes, allUsers] = await Promise.all([
      db.select({ count: sql<number>`cast(count(${users.id}) as integer)` }).from(users).catch(() => [{ count: 0 }]),
      db.select({ count: sql<number>`cast(count(${channels.id}) as integer)` }).from(channels).catch(() => [{ count: 0 }]),
      db.select({ count: sql<number>`cast(count(${meetings.id}) as integer)` }).from(meetings).where(
        and(
          gte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
          lte(meetings.endTime, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
        )
      ).catch(() => [{ count: 0 }]),
      db.select({ id: users.id }).from(users).catch(() => [])
    ]);

    totalUserCount = totalUsersRes[0]?.count || 0;
    channelCount = channelCountRes[0]?.count || 0;
    meetingCount = meetingCountRes[0]?.count || 0;

    (allUsers || []).forEach(u => {
      try {
        if (getUserPresenceStatus(u.id) !== "offline") {
          initialActiveCount++;
        }
      } catch (e) {}
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
  }

  try {
    if (user?.id) {
      const userMeetingIds = (await db.select({ meetingId: meetingParticipants.meetingId })
        .from(meetingParticipants)
        .where(eq(meetingParticipants.userId, user.id))).map(x => x.meetingId);

      if (userMeetingIds.length > 0) {
        const upcomingMeetings = await db.query.meetings.findMany({
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

        formattedUpcomingMeetings = (upcomingMeetings || []).map(m => ({
          id: m.id,
          title: m.title,
          startTime: m.startTime ? new Date(m.startTime).toISOString() : new Date().toISOString(),
          participants: m.participants || []
        }));
      }
    }
  } catch (err) {
    console.error("Error fetching upcoming meetings:", err);
  }

  try {
    const rawRecentMessages = await db.query.messages.findMany({
      with: {
        sender: { columns: { name: true, avatar: true } },
        channel: { columns: { name: true } }
      },
      orderBy: (msg, { desc }) => [desc(msg.createdAt)],
      limit: 5
    });

    recentMessages = (rawRecentMessages || []).map(m => ({
      id: m.id,
      content: m.content || "",
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      sender: {
        name: m.sender?.name || "Unknown",
        avatar: m.sender?.avatar || undefined
      },
      channel: m.channel ? { name: m.channel.name } : undefined
    }));
  } catch (err) {
    console.error("Error fetching recent messages:", err);
  }

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



