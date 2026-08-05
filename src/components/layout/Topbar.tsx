"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import agriLogo from "../../../public/Agri Logo.png";
import { Search, Bell, Settings, LogOut, ChevronDown, Shield, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useUI } from "@/components/UIProvider";
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
}

export default function Topbar({ currentUser }: { currentUser: User }) {
  const { toggleMobileSidebar } = useUI();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myStatus, setMyStatus] = useState(currentUser.status || 'online');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{users: User[], channels: any[], messages: any[]}>({ users: [], channels: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchMenu, setShowSearchMenu] = useState(false);

  const { socket } = useSocket();

  useEffect(() => {
    fetch("/api/notifications")
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
      });
  }, []);

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
        <div className={styles.logoWrap}>
          <Image src={agriLogo} alt="Agri Logo" width={60} height={60} style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} unoptimized />
        </div>
        <span className={styles.brandName}>AGRI COMM</span>
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
                              {u.avatar ? <Image src={u.avatar} alt={u.name} width={32} height={32} /> : initials(u.name)}
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
                              {m.sender.avatar ? <Image src={m.sender.avatar} alt={m.sender.name} width={32} height={32} /> : initials(m.sender.name)}
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
            onClick={() => setShowNotifMenu(!showNotifMenu)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {showNotifMenu && (
            <>
              <div className={styles.overlay} onClick={() => setShowNotifMenu(false)} />
              <div className={styles.menu}>
                <div className={styles.menuHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className={styles.menuName}>Notifications</p>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => handleMarkRead()} 
                      style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No new notifications.</p>
                  ) : (
                    notifications.map(n => (
                      <Link 
                        key={n.id} 
                        href={n.link || "#"} 
                        className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                        onClick={() => {
                          handleMarkRead(n.id);
                          setShowNotifMenu(false);
                        }}
                      >
                        <div className={styles.notifContent}>
                          <span className={styles.notifTitle}>{n.title}</span>
                          <span className={styles.notifText}>{n.content}</span>
                        </div>
                        {!n.read && <div className={styles.unreadDot} />}
                      </Link>
                    ))
                  )}
                </div>
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
              {currentUser.image ? <Image src={currentUser.image} alt={currentUser.name} width={32} height={32} /> : initials(currentUser.name || 'U')}
              <span className="status-dot"></span>
            </div>
            <span className={styles.userName}>{currentUser.name}</span>
            <ChevronDown size={14} className={styles.chevron} />
          </div>

          {showProfileMenu && (
            <>
              <div className={styles.overlay} onClick={() => setShowProfileMenu(false)} />
              <div className={styles.menu}>
                <div className={styles.menuHeader}>
                  <p className={styles.menuName}>{currentUser.name}</p>
                  <p className={styles.menuEmail}>{currentUser.email}</p>
                </div>
                
                <div className={styles.menuItems}>
                  <div style={{ padding: '8px 12px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Status</p>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 2 }} onClick={() => handleStatusChange('online')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-online)', marginRight: 4 }} />
                      <span style={{ flex: 1 }}>Active</span>
                      {myStatus === 'online' && <span style={{ color: 'var(--status-online)', fontSize: 16 }}>✓</span>}
                    </button>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 2 }} onClick={() => handleStatusChange('away')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-away)', marginRight: 4 }} />
                      <span style={{ flex: 1 }}>Away</span>
                      {myStatus === 'away' && <span style={{ color: 'var(--status-away)', fontSize: 16 }}>✓</span>}
                    </button>
                    
                    <button className={styles.menuItem} style={{ padding: '6px 8px', marginBottom: 8 }} onClick={() => handleStatusChange('offline')}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-offline)', marginRight: 4, border: '2px solid var(--text-muted)' }} />
                      <span style={{ flex: 1 }}>Invisible</span>
                      {myStatus === 'offline' && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>✓</span>}
                    </button>
                  </div>
                  
                  <div className={styles.divider} />
                  
                  <Link href="/settings" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                    <Settings size={16} /> Account Settings
                  </Link>
                  {currentUser.role === 'admin' && (
                    <Link href="/admin" className={styles.menuItem} onClick={() => setShowProfileMenu(false)}>
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}
                  <div className={styles.divider} />
                  <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => signOut({ callbackUrl: '/login' })}>
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
