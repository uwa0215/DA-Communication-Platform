import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Megaphone, Link as LinkIcon, Users, FileText, Shield, Zap, ShieldCheck, Globe, MessageSquare, CalendarDays, Hash, UserPlus, ArrowRight, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./dashboard.module.css";
import { getPhilippineHolidays } from "@/lib/philippineHolidays";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  // Get current time for greeting
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  // Fetch stats
  const [userCount, channelCount, meetingCount] = await Promise.all([
    prisma.user.count({ where: { status: { not: "offline" } } }),
    prisma.channel.count(),
    prisma.meeting.count({
      where: {
        startTime: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        endTime: { lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
      }
    })
  ]);

  // Fetch upcoming meetings for this user
  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      participants: { some: { userId: user?.id } },
      startTime: { gte: now }
    },
    include: {
      createdBy: { select: { name: true, avatar: true } },
      participants: { include: { user: { select: { name: true, avatar: true } } } }
    },
    orderBy: { startTime: 'asc' },
    take: 3
  });

  // Get upcoming holidays
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const upcomingHolidays = getPhilippineHolidays(now.getFullYear())
    .filter(h => h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  // Fetch recent channel messages for activity feed
  const recentMessages = await prisma.message.findMany({
    where: {},
    include: {
      sender: { select: { name: true, avatar: true } },
      channel: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

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
              {greeting}, <span className={styles.heroName}>{firstName}</span> 👋
            </h1>
            <p className={styles.heroSub} style={{ opacity: 1, visibility: 'visible' }}>
              Welcome to your AGRI COMM workspace. Here's what's happening today.
            </p>
          </div>
          <div className={styles.heroLogo}>
            <Image src="/Agri%20Logo.png" alt="Agri Logo" width={120} height={120} style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} unoptimized />
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
              const start = new Date(m.startTime);
              const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <Link key={m.id} href="/calendar" className={styles.upcomingItem}>
                  <div className={styles.upcomingDot} />
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingTitle}>{m.title}</span>
                    <span className={styles.upcomingMeta}>
                      <Clock size={12} /> {dateStr} · {timeStr} · {m.participants.length} attendee{m.participants.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              );
            })}
            {upcomingHolidays.map((h, i) => {
              const hDate = new Date(h.date + 'T00:00:00');
              const dateStr = hDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
              return (
                <div key={`holiday-${i}`} className={styles.upcomingItem} style={{ cursor: 'default' }}>
                  <div className={`${styles.upcomingDot} ${styles.upcomingDotHoliday}`} />
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingTitle}>🇵🇭 {h.name}</span>
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
              recentMessages.map(m => (
                <div key={m.id} className={styles.activityItem}>
                  <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                    {m.sender.avatar ? <Image src={m.sender.avatar} alt="" width={32} height={32} /> : m.sender.name[0]}
                  </div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityAuthor}>
                      {m.sender.name}
                      {m.channel && <span className={styles.activityChannel}> in #{m.channel.name}</span>}
                    </span>
                    <span className={styles.activityText} dangerouslySetInnerHTML={{ __html: (m.content || '').substring(0, 80) + ((m.content || '').length > 80 ? '...' : '') }} />
                  </div>
                  <span className={styles.activityTime}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
