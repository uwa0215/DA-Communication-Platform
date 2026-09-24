"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Users, Hash, CalendarDays, UserPlus, MessageSquare, 
  ArrowRight, ShieldCheck, Megaphone, MessageCircle
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import UserAvatar from "@/components/UserAvatar";
import styles from "./dashboard.module.css";

interface UserItem {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
}

interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  sender: { name: string; avatar?: string };
  channel?: { name: string };
}

interface MeetingItem {
  id: string;
  title: string;
  startTime: string;
  participants: any[];
}

interface DashboardClientProps {
  greeting: string;
  userName: string;
  currentUserId: string;
  channelCount: number;
  meetingCount: number;
  totalUserCount: number;
  initialActiveCount: number;
  upcomingMeetings: MeetingItem[];
  recentMessages: MessageItem[];
}

export default function DashboardClient({
  greeting,
  userName,
  currentUserId,
  channelCount,
  meetingCount,
  totalUserCount,
  initialActiveCount,
  upcomingMeetings,
  recentMessages,
}: DashboardClientProps) {
  const { socket } = useSocket();
  const { data: usersData, mutate: mutateUsers } = useSWR("/api/users", fetcher, { refreshInterval: 5000 });

  const [activeUsersList, setActiveUsersList] = useState<UserItem[]>([]);
  const [activeCount, setActiveCount] = useState<number>(initialActiveCount);

  // Sync real active users from live presence endpoint
  useEffect(() => {
    if (usersData?.users && Array.isArray(usersData.users)) {
      const liveList: UserItem[] = usersData.users;
      const onlineOnly = liveList.filter(u => u.status !== "offline");
      setActiveUsersList(onlineOnly);
      setActiveCount(Math.max(1, onlineOnly.length));
    }
  }, [usersData]);

  // Real-time socket presence updates
  useEffect(() => {
    if (!socket) return;

    const handlePresence = () => {
      mutateUsers();
    };

    socket.on("user-presence", handlePresence);
    socket.on("initial-presences", () => mutateUsers());

    return () => {
      socket.off("user-presence", handlePresence);
      socket.off("initial-presences");
    };
  }, [socket, mutateUsers]);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className={styles.dashboard}>
      {/* Hero Welcome Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroTextBlock}>
            <div className={styles.heroBadge}>
              <ShieldCheck size={14} /> DA CALABARZON Regional Enterprise Communication System (DA-RECS)
            </div>
            <h1 className={styles.heroTitle} style={{ opacity: 1, visibility: 'visible' }}>
              {greeting}, <span className={styles.heroName}>{firstName}</span>
            </h1>
            <p className={styles.heroSub} style={{ opacity: 1, visibility: 'visible' }}>
              Welcome to your Trellis (DA-RECS) workspace. Here is what is happening today across the region.
            </p>
          </div>
          <div className={styles.heroLogo}>
            <Image src="/New%20Logo.png" alt="Agri Logo" width={110} height={110} className="theme-logo" style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} unoptimized priority />
          </div>
        </div>
      </section>

      {/* Accurate Communication Metrics Row */}
      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`} style={{ position: 'relative' }}>
            <Users size={22} />
            <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{activeCount}</span>
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
            <Users size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{totalUserCount}</span>
            <span className={styles.statLabel}>Team Size</span>
          </div>
        </div>
      </section>

      {/* Communication Shortcuts */}
      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Communication Shortcuts</h2>
        <div className={styles.actionsGrid}>
          <Link href="/people" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconGreen}`}>
              <UserPlus size={24} />
            </div>
            <span className={styles.actionLabel}>Find People</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/channels/general" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconBlue}`}>
              <Hash size={24} />
            </div>
            <span className={styles.actionLabel}>Channels</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/calendar" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconPurple}`}>
              <CalendarDays size={24} />
            </div>
            <span className={styles.actionLabel}>Schedule Meeting</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
          <Link href="/mentions" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.actionIconAmber}`}>
              <MessageSquare size={24} />
            </div>
            <span className={styles.actionLabel}>View Mentions</span>
            <ArrowRight size={14} className={styles.actionArrow} />
          </Link>
        </div>
      </section>

      {/* Two Column Layout: Real Active Members + Recent Activity */}
      <div className={styles.twoCol}>
        {/* Real Active Now Team Members */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Users size={18} />
            </div>
            <span>Active Team Members ({activeCount})</span>
          </div>
          <div className={styles.upcomingList}>
            {activeUsersList.length === 0 ? (
              <p className={styles.emptyState}>No other team members online at this moment.</p>
            ) : (
              activeUsersList.map(u => (
                <div key={u.id} className={styles.upcomingItem} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div className={`avatar avatar-sm status-${u.status || 'online'}`} style={{ flexShrink: 0 }}>
                      <UserAvatar src={u.avatar} name={u.name} size={32} />
                      <span className="status-dot" />
                    </div>
                    <div className={styles.upcomingInfo} style={{ minWidth: 0 }}>
                      <span className={styles.upcomingTitle} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name} {u.id === currentUserId && "(You)"}
                      </span>
                      <span className={styles.upcomingMeta} style={{ textTransform: 'capitalize' }}>
                        {u.jobTitle || u.department || u.status}
                      </span>
                    </div>
                  </div>

                  {u.id !== currentUserId && (
                    <Link
                      href={`/dm/${u.id}`}
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: 12, borderRadius: 16, background: 'var(--brand)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    >
                      <MessageCircle size={14} /> Message
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Channel Messages */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><Megaphone size={18} /></div>
            <span>Recent Activity</span>
          </div>
          <div className={styles.activityList}>
            {(!recentMessages || recentMessages.length === 0) ? (
              <p className={styles.emptyState}>No recent messages yet.</p>
            ) : (
              recentMessages.map(m => (
                <div key={m.id} className={styles.activityItem}>
                  <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                    <UserAvatar src={m.sender?.avatar} name={m.sender?.name || "User"} size={32} />
                  </div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityAuthor}>
                      {m.sender?.name || "Unknown User"}
                      {m.channel && <span className={styles.activityChannel}> in #{m.channel.name}</span>}
                    </span>
                    <span className={styles.activityText} dangerouslySetInnerHTML={{ __html: (m.content || '').substring(0, 80) + ((m.content || '').length > 80 ? '...' : '') }} />
                  </div>
                  <span className={styles.activityTime}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
