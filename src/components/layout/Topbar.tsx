"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import agriLogo from "../../../public/New Logo.png";
import { Search, Bell, Settings, LogOut, ChevronDown, Shield, Menu, Moon, Sun, Monitor, HelpCircle, User, MessageSquare, Check } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useUI } from "@/components/UIProvider";
import { useTheme } from "@/components/ThemeProvider";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import UserAvatar from "@/components/UserAvatar";
import styles from "./Topbar.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: string;
  role?: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt?: string;
}

function formatNotifTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getNotifInitials(title: string) {
  const clean = title.replace(/mentioned you in .*/i, '').replace(/mentioned you/i, '').trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (clean[0] || 'N').toUpperCase();
}

export default function Topbar({ currentUser }: { currentUser: User }) {
  const router = useRouter();
  const { toggleMobileSidebar } = useUI();
  const { theme, setTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myStatus, setMyStatus] = useState(currentUser.status || 'online');

  const handleSignOut = async () => {
    setShowProfileMenu(false);
    await signOut({ redirect: false });
    router.push("/login");
  };
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{users: User[], channels: any[], messages: any[]}>({ users: [], channels: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchMenu, setShowSearchMenu] = useState(false);

  const { socket } = useSocket();

  const { data: notifData, mutate: mutateNotifs } = useSWR("/api/notifications", fetcher, { revalidateOnFocus: false, dedupingInterval: 15000 });
  const { data: meData } = useSWR("/api/users/me", fetcher, { revalidateOnFocus: false, dedupingInterval: 30000 });

  const userAvatar = meData?.user?.avatar || (currentUser as any)?.avatar || currentUser?.image;
  const userName = meData?.user?.name || currentUser?.name || "User";
  const userEmail = meData?.user?.email || currentUser?.email || "";

  useEffect(() => {
    if (notifData?.notifications) setNotifications(notifData.notifications);
  }, [notifData]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on("new-notification", (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      socket.off("new-notification");
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => 
      (id ? n.id === id : true) ? { ...n, read: true } : n
    ));
  };

  const handleStatusChange = async (newStatus: string) => {
    setMyStatus(newStatus);
    await fetch("/api/users/presence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], channels: [], messages: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delay = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setSearchResults(data);
          }
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.mobileMenuBtn} onClick={toggleMobileSidebar} aria-label="Toggle mobile menu">
          <Menu size={24} />
        </button>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }} title="Go to Dashboard">
          <div className={styles.logoWrap}>
            <Image src={agriLogo} alt="Agri Logo" width={60} height={60} className="theme-logo" style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} unoptimized priority />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.brandName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Trellis
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', background: 'var(--brand-light)', padding: '1px 6px', borderRadius: 4, color: 'var(--brand)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>DA-RECS</span>
            </span>
          </div>
        </Link>
      </div>

      <div className={styles.center}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search channels, people, messages..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchMenu(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setShowSearchMenu(true);
            }}
          />
          
          {showSearchMenu && searchQuery.trim() && (
            <>
              <div className={styles.overlay} onClick={() => setShowSearchMenu(false)} style={{ background: 'transparent' }} />
              <div className={styles.searchDropdown}>
                {isSearching ? (
                  <div className={styles.noResults}>Searching...</div>
                ) : searchResults.channels.length === 0 && searchResults.users.length === 0 && searchResults.messages.length === 0 ? (
                  <div className={styles.noResults}>No results found for "{searchQuery}"</div>
                ) : (
                  <>
                    {searchResults.channels.length > 0 && (
                      <div>
                        <div className={styles.searchCategory}>Channels</div>
                        {searchResults.channels.map((c: any) => (
                          <Link key={c.id} href={`/channels/${c.name}`} className={styles.searchResultItem} onClick={() => setShowSearchMenu(false)}>
                            <div className={styles.searchResultIconWrap}>
                              <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>#</span>
                            </div>
                            <div className={styles.searchResultText}>
                              <span className={styles.searchResultName}>{c.name}</span>
                              {c.isPrivate && <span className={styles.searchResultSub}>Private Channel</span>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.users.length > 0 && (
                      <div>
                        <div className={styles.searchCategory}>People</div>
                        {searchResults.users.map((u: any) => (
                          <Link key={u.id} href={`/dm/${u.id}`} className={styles.searchResultItem} onClick={() => setShowSearchMenu(false)}>
                            <div className={`avatar avatar-sm status-${u.status}`}>
                              <UserAvatar src={u.avatar} name={u.name} size={32} />
                            </div>
                            <div className={styles.searchResultText}>
                              <span className={styles.searchResultName}>{u.name}</span>
                              <span className={styles.searchResultSub}>{u.jobTitle || u.email}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {searchResults.messages.length > 0 && (
                      <div>
                        <div className={styles.searchCategory}>Messages</div>
                        {searchResults.messages.map((m: any) => (
                          <Link 
                            key={m.id} 
                            href={m.type === 'channel' ? `/channels/${m.channel.name}` : `/dm/${m.otherUser.id}`} 
                            className={styles.searchResultItem} 
                            onClick={() => setShowSearchMenu(false)}
                          >
                            <div className={`avatar avatar-sm`}>
                              <UserAvatar src={m.sender.avatar} name={m.sender.name} size={32} />
                            </div>
                            <div className={styles.searchResultText}>
                              <span className={styles.searchResultName}>{m.sender.name} <span style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 'normal'}}>in {m.type === 'channel' ? `#${m.channel.name}` : 'DM'}</span></span>
                              <span className={styles.searchResultSub} dangerouslySetInnerHTML={{ __html: m.content.substring(0, 60) + (m.content.length > 60 ? '...' : '') }} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.notificationDropdown}>
          <button 
            className={`btn-icon ${styles.iconBtn}`} 
            title="Notifications"
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowAllNotifs(false);
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {showNotifMenu && (
            <>
              <div className={styles.overlay} onClick={() => setShowNotifMenu(false)} />
              <div className={styles.notifMenu}>
                <div className={styles.menuHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className={styles.menuName} style={{ fontSize: '15px' }}>Notifications</p>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => handleMarkRead()} 
                      style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {(() => {
                    const unreadNotifs = notifications.filter(n => !n.read);
                    const displayedNotifs = showAllNotifs ? notifications : unreadNotifs;

                    if (displayedNotifs.length === 0) {
                      return (
                        <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                          {!showAllNotifs && notifications.length > 0 ? "No unread notifications." : "No notifications yet."}
                        </p>
                      );
                    }

                    return displayedNotifs.map(n => {
                      const initialLetters = getNotifInitials(n.title);
                      const isMention = n.title.toLowerCase().includes("mention");

                      return (
                        <Link 
                          key={n.id} 
                          href={n.link || "#"} 
                          className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                          onClick={() => {
                            handleMarkRead(n.id);
                            setShowNotifMenu(false);
                          }}
                        >
                          <div className={styles.notifIconWrap}>
                            {isMention ? <MessageSquare size={16} /> : initialLetters}
                          </div>
                          <div className={styles.notifBody}>
                            <div className={styles.notifHeaderRow}>
                              <span className={styles.notifTitle}>{n.title}</span>
                              <span className={styles.notifTime}>{formatNotifTime(n.createdAt)}</span>
                            </div>
                            <p className={styles.notifText}>{n.content}</p>
                          </div>
                          {!n.read && <div className={styles.unreadDot} />}
                        </Link>
                      );
                    });
                  })()}
                </div>

                {notifications.length > 0 && (
                  <div className={styles.menuFooter}>
                    {!showAllNotifs ? (
                      <button 
                        className={styles.seeMoreBtn}
                        onClick={() => setShowAllNotifs(true)}
                      >
                        See more
                      </button>
                    ) : (
                      <button 
                        className={styles.seeMoreBtn}
                        onClick={() => setShowAllNotifs(false)}
                      >
                        Show unread only
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.profileDropdown}>
          <div 
            className={styles.profileTrigger} 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            <div className={`avatar avatar-sm ${styles.avatar} status-${myStatus}`}>
              <UserAvatar src={userAvatar} name={userName} size={32} />
              <span className="status-dot"></span>
            </div>
            <span className={styles.userName}>{userName}</span>
            <ChevronDown size={14} className={styles.chevron} />
          </div>

          {showProfileMenu && (
            <>
              <div className={styles.overlay} onClick={() => setShowProfileMenu(false)} />
              <div className={styles.menu}>
                <div className={styles.menuHeader}>
                  <p className={styles.menuName}>{userName}</p>
                  <p className={styles.menuEmail}>{userEmail}</p>
                </div>
                
                <div className={styles.menuItems}>
                  <div style={{ padding: '8px 12px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Status</p>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 2 }} onClick={() => handleStatusChange('online')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-online)', marginRight: 4 }} />
                      <span style={{ flex: 1 }}>Active</span>
                      {myStatus === 'online' && <Check size={16} style={{ color: 'var(--status-online)' }} />}
                    </button>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 2 }} onClick={() => handleStatusChange('away')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-away)', marginRight: 4 }} />
                      <span style={{ flex: 1 }}>Away</span>
                      {myStatus === 'away' && <Check size={16} style={{ color: 'var(--status-away)' }} />}
                    </button>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 8 }} onClick={() => handleStatusChange('offline')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-offline)', marginRight: 4, border: '2px solid var(--text-muted)' }} />
                      <span style={{ flex: 1 }}>Invisible</span>
                      {myStatus === 'offline' && <Check size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </div>
                  
                  <div className={styles.divider} />
                  
                  <Link href="/settings" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                    <User size={16} /> My Profile
                  </Link>
                  <Link href="/settings" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                    <Settings size={16} /> Account Settings
                  </Link>

                  <div className={styles.divider} />

                  <div style={{ padding: '8px 12px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Appearance</p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        className={styles.menuItem} 
                        style={{ flex: 1, justifyContent: 'center', padding: '6px', background: theme === 'light' ? 'var(--surface-active)' : 'transparent' }}
                        onClick={() => setTheme('light')}
                        title="Light Mode"
                      >
                        <Sun size={14} />
                      </button>
                      <button 
                        className={styles.menuItem} 
                        style={{ flex: 1, justifyContent: 'center', padding: '6px', background: theme === 'dark' ? 'var(--surface-active)' : 'transparent' }}
                        onClick={() => setTheme('dark')}
                        title="Dark Mode"
                      >
                        <Moon size={14} />
                      </button>
                      <button 
                        className={styles.menuItem} 
                        style={{ flex: 1, justifyContent: 'center', padding: '6px', background: theme === 'system' ? 'var(--surface-active)' : 'transparent' }}
                        onClick={() => setTheme('system')}
                        title="System Theme"
                      >
                        <Monitor size={14} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <a href="mailto:support@trellis.da.gov.ph" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                    <HelpCircle size={16} /> Help & Support
                  </a>
                  
                  {currentUser.role?.toUpperCase() === 'ADMIN' && (
                    <Link href="/admin" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}
                  <div className={styles.divider} />
                  <button className={`${styles.menuItem} ${styles.danger}`} onClick={handleSignOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

