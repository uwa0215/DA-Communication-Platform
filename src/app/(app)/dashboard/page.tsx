import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, channels, meetings, meetingParticipants, messages } from "@/lib/schema";
import { sql, eq, ne, and, gte, lte } from "drizzle-orm";
import { Megaphone, Users, ShieldCheck, CalendarDays, Hash, UserPlus, ArrowRight, Clock, TrendingUp, Shield, MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./dashboard.module.css";
import { getPhilippineHolidays } from "@/lib/philippineHolidays";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let userCount = 0;
  let channelCount = 0;
  let meetingCount = 0;
  let upcomingMeetings: any[] = [];
  let upcomingHolidays: any[] = [];
  let recentMessages: any[] = [];
  let firstName = "there";

  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.name) {
      firstName = user.name.split(" ")[0] || "there";
    }

    // 1. Fetch Stats
    try {
      const [userCountRes, channelCountRes, meetingCountRes] = await Promise.all([
        db.select({ count: sql<number>`cast(count(${users.id}) as integer)` }).from(users).where(ne(users.status, "offline")),
        db.select({ count: sql<number>`cast(count(${channels.id}) as integer)` }).from(channels),
        db.select({ count: sql<number>`cast(count(${meetings.id}) as integer)` }).from(meetings).where(
          and(
            gte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
            lte(meetings.endTime, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
          )
        )
      ]);
      userCount = userCountRes[0]?.count ?? 0;
      channelCount = channelCountRes[0]?.count ?? 0;
      meetingCount = meetingCountRes[0]?.count ?? 0;
    } catch (err) {
      console.error("[Dashboard] Error fetching stats:", err);
    }

    // 2. Fetch User Meetings
    if (user?.id) {
      try {
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
      } catch (err) {
        console.error("[Dashboard] Error fetching upcoming meetings:", err);
      }
    }

    // 3. Fetch Holidays
    try {
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      upcomingHolidays = getPhilippineHolidays(now.getFullYear())
        .filter(h => h.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);
    } catch (err) {
      console.error("[Dashboard] Error fetching holidays:", err);
    }

    // 4. Fetch Activity Feed Messages
    try {
      recentMessages = await db.query.messages.findMany({
        with: {
          sender: { columns: { name: true, avatar: true } },
          channel: { columns: { name: true } }
        },
        orderBy: (msg, { desc }) => [desc(msg.createdAt)],
        limit: 5
      });
    } catch (err) {
      console.error("[Dashboard] Error fetching recent messages:", err);
    }

  } catch (globalErr) {
    console.error("[Dashboard] Unhandled error during server component execution:", globalErr);
  }

  return (
    <div className={styles.dashboard}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroTextBlock}>
            <div className={styles.heroBadge}>
              <ShieldCheck size={14} /> DA CALABARZON Employee Portal
            </div>
            <h1 className={styles.heroTitle} style={{ opacity: 1, visibility: 'visible' }}>
              {greeting}, <span className={styles.heroName}>{firstName}</span>
            </h1>
            <p className={styles.heroSub} style={{ opacity: 1, visibility: 'visible' }}>
              Welcome to your Trellis workspace. Here's what's happening today.
            </p>
          </div>
          <div className={styles.heroLogo}>
            <Image src="/New%20Logo.png" alt="Agri Logo" width={120} height={120} className="theme-logo" style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} unoptimized priority />
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <Users size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{userCount}</span>
            <span className={styles.statLabel}>Active Now</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <Hash size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{channelCount}</span>
            <span className={styles.statLabel}>Channels</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <CalendarDays size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{meetingCount}</span>
            <span className={styles.statLabel}>Meetings Today</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>99%</span>
            <span className={styles.statLabel}>Uptime</span>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Link href="/people" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconGreen}`}>
              <UserPlus size={24} />
            </div>
            <span className={styles.actionLabel}>Find People</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/calendar" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconBlue}`}>
              <CalendarDays size={24} />
            </div>
            <span className={styles.actionLabel}>Schedule Meeting</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/mentions" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconPurple}`}>
              <MessageSquare size={24} />
            </div>
            <span className={styles.actionLabel}>View Mentions</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/settings" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconAmber}`}>
              <Shield size={24} />
            </div>
            <span className={styles.actionLabel}>Settings</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
        </div>
      </section>

      {/* Two Column: Upcoming + Activity */}
      <div className={styles.twoCol}>
        {/* Upcoming */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><CalendarDays size={18} /></div>
            <span>Upcoming</span>
          </div>
          <div className={styles.upcomingList}>
            {upcomingMeetings.length === 0 && upcomingHolidays.length === 0 && (
              <p className={styles.emptyState}>No upcoming events. Enjoy your day!</p>
            )}
            {upcomingMeetings.map(m => {
              if (!m?.startTime) return null;
              const start = new Date(m.startTime);
              const timeStr = isNaN(start.getTime()) ? '' : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = isNaN(start.getTime()) ? '' : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const participantCount = m.participants?.length || 0;
              return (
                <Link key={m.id} href="/calendar" className={styles.upcomingItem}>
                  <div className={styles.upcomingDot} />
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingTitle}>{m.title || 'Untitled Meeting'}</span>
                    <span className={styles.upcomingMeta}>
                      <Clock size={12} /> {dateStr} · {timeStr} · {participantCount} attendee{participantCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              );
            })}
            {upcomingHolidays.map((h, i) => {
              const hDate = new Date(h.date + 'T00:00:00');
              const dateStr = isNaN(hDate.getTime()) ? h.date : hDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
              return (
                <div key={`holiday-${i}`} className={styles.upcomingItem} style={{ cursor: 'default' }}>
                  <div className={`${styles.upcomingDot} ${styles.upcomingDotHoliday}`} />
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingTitle}>{h.name}</span>
                    <span className={styles.upcomingMeta}>{dateStr} · {h.type === 'regular' ? 'Regular Holiday' : 'Special Non-Working'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity Feed */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><Megaphone size={18} /></div>
            <span>Recent Activity</span>
          </div>
          <div className={styles.activityList}>
            {recentMessages.length === 0 ? (
              <p className={styles.emptyState}>No recent activity yet.</p>
            ) : (
              recentMessages.map(m => {
                const senderName = m.sender?.name || 'Unknown User';
                const senderAvatar = m.sender?.avatar;
                const initial = senderName[0]?.toUpperCase() || 'U';
                const channelName = m.channel?.name;
                const contentSnippet = (m.content || '').substring(0, 80) + ((m.content || '').length > 80 ? '...' : '');
                const createdAtDate = m.createdAt ? new Date(m.createdAt) : null;
                const timeStr = createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <div key={m.id} className={styles.activityItem}>
                    <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                      {senderAvatar ? <Image src={senderAvatar} alt="" width={32} height={32} /> : initial}
                    </div>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityAuthor}>
                        {senderName}
                        {channelName && <span className={styles.activityChannel}> in #{channelName}</span>}
                      </span>
                      <span className={styles.activityText} dangerouslySetInnerHTML={{ __html: contentSnippet }} />
                    </div>
                    <span className={styles.activityTime}>
                      {timeStr}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


