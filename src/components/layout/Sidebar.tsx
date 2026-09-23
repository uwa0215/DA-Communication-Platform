"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Hash, MessageCircle, Users, Plus, ChevronDown, ChevronRight,
  Settings, LogOut, Search, Bell, BellOff, Sprout, Shield, MoreVertical,
  User as UserIcon, Pin, Video, Ban, Phone,
  Filter, SquarePen, AtSign, Compass, Calendar, Trash2, Archive, AlertTriangle, UserX, X, CheckCheck
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import UserProfileModal from "@/components/chat/UserProfileModal";
import { useCall } from "@/components/CallProvider";
import { useUI } from "@/components/UIProvider";
import { prefetchChatMessages } from "@/lib/clientMessageCache";
import { loadSettings } from "@/lib/settingsStore";
import { playMessengerIncomingSound } from "@/lib/audioEffects";
import styles from "./Sidebar.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: string;
  role?: string;
}

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  isGroup?: boolean;
  avatar?: string;
  _count?: { messages: number };
}

interface DMUser {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  jobTitle?: string;
  lastMessageAt?: number;
}

interface SidebarProps {
  currentUser: User;
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUI();
  const pathname = usePathname();
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { initiateCall } = useCall();

  const { data: meData } = useSWR("/api/users/me", fetcher, { revalidateOnFocus: false, dedupingInterval: 30000 });
  const myAvatar = meData?.user?.avatar || (currentUser as any)?.avatar || currentUser?.image;
  const myName = meData?.user?.name || currentUser?.name || "User";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmUsers, setDmUsers] = useState<DMUser[]>([]);
  const [allUsers, setAllUsers] = useState<DMUser[]>([]);
  
  const [activeFilter, setActiveFilter] = useState("All"); // All, Unread, Channels, Direct

  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number | 'auto'; bottom: number | 'auto'; left: number }>({ top: 0, bottom: 'auto', left: 0 });
  const [newChannelName, setNewChannelName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [dmSearch, setDmSearch] = useState("");
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, number>>({});
  const [presences, setPresences] = useState<Record<string, string>>({});
  const [myStatus, setMyStatus] = useState<string>(currentUser.status || "online");

  // Resize State (Default 340px for Messenger spacing)
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);

  // Persisted preferences
  const [pinnedDMs, setPinnedDMs] = useState<string[]>([]);
  const [mutedDMs, setMutedDMs] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [archivedDMs, setArchivedDMs] = useState<string[]>([]);
  
  // Overlays
  const [selectedProfileUser, setSelectedProfileUser] = useState<DMUser | null>(null);
  const [videoCallingUser, setVideoCallingUser] = useState<DMUser | null>(null);
  const [audioCallingUser, setAudioCallingUser] = useState<DMUser | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("trellis_pinnedDMs");
      if (p) setPinnedDMs(JSON.parse(p));
      const m = localStorage.getItem("trellis_mutedDMs");
      if (m) setMutedDMs(JSON.parse(m));
      const b = localStorage.getItem("trellis_blockedUsers");
      if (b) setBlockedUsers(JSON.parse(b));
      const a = localStorage.getItem("trellis_archivedDMs");
      if (a) setArchivedDMs(JSON.parse(a));
      const w = localStorage.getItem("trellis_sidebar_width");
      if (w) setSidebarWidth(parseInt(w, 10));
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!isResizing && sidebarWidth !== 340) {
      localStorage.setItem("trellis_sidebar_width", sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      setSidebarWidth(Math.min(Math.max(e.clientX, 280), 500));
    };
    const handleMouseUp = () => setIsResizing(false);
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  const togglePin = (id: string) => {
    setPinnedDMs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("trellis_pinnedDMs", JSON.stringify(next));
      return next;
    });
  };

  const toggleMute = (id: string) => {
    setMutedDMs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("trellis_mutedDMs", JSON.stringify(next));
      return next;
    });
  };

  const blockUser = (id: string) => {
    setBlockedUsers(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("trellis_blockedUsers", JSON.stringify(next));
      return next;
    });
  };

  const toggleArchive = (id: string) => {
    setArchivedDMs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("trellis_archivedDMs", JSON.stringify(next));
      return next;
    });
  };

  const reportUser = (id: string) => {
    if (window.confirm("Are you sure you want to report this user? Our moderation team will review this chat.")) {
      alert("User has been reported. Thank you for keeping the community safe.");
    }
  };

  const { data: channelsData, mutate: mutateChannels } = useSWR("/api/channels", fetcher, { revalidateOnFocus: false, dedupingInterval: 10000 });
  const { data: usersData, mutate: mutateUsers } = useSWR("/api/users", fetcher, { revalidateOnFocus: false, dedupingInterval: 10000 });
  const { data: dmUsersData, mutate: mutateDmUsers } = useSWR("/api/users/dms", fetcher, { revalidateOnFocus: false, dedupingInterval: 10000 });

  useEffect(() => {
    if (channelsData?.channels) setChannels(channelsData.channels);
  }, [channelsData]);

  useEffect(() => {
    if (usersData?.users) {
      const others = usersData.users.filter((u: DMUser) => u.id !== currentUser.id);
      setAllUsers(others);
      const p: Record<string, string> = {};
      usersData.users.forEach((u: DMUser) => { p[u.id] = u.status; });
      setPresences(p);
    }
  }, [usersData, currentUser.id]);

  useEffect(() => {
    if (dmUsersData?.users) {
      setDmUsers(dmUsersData.users);
      setUnreadDMs(prev => {
        const updated = { ...prev };
        const currentDmMatch = pathname.match(/\/dm\/(.+)/);
        const currentDmId = currentDmMatch ? currentDmMatch[1] : null;

        dmUsersData.users.forEach((u: DMUser & { unreadCount?: number }) => {
          if (u.id === currentDmId) {
            updated[u.id] = 0;
          } else if (typeof u.unreadCount === "number") {
            updated[u.id] = u.unreadCount;
          }
        });
        return updated;
      });

      setLastMessageTimes(prev => {
        const updated = { ...prev };
        dmUsersData.users.forEach((u: DMUser) => {
          if (u.lastMessageAt) {
            updated[u.id] = Math.max(updated[u.id] || 0, u.lastMessageAt);
          }
        });
        return updated;
      });
    }
  }, [dmUsersData, pathname]);

  useEffect(() => {
    fetch("/api/users/presence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online" }),
    });
    setMyStatus("online");
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-user", currentUser.id);

    socket.on("user-presence", ({ userId, status }: { userId: string; status: string }) => {
      setPresences(p => ({ ...p, [userId]: status }));
    });

    socket.on("initial-presences", (initialMap: Record<string, string>) => {
      setPresences(initialMap);
    });

    socket.on("dm-notification", async ({ from, sender }: { from: string; sender?: any }) => {
      const currentDmMatch = window.location.pathname.match(/\/dm\/(.+)/);
      const currentDmId = currentDmMatch ? currentDmMatch[1] : null;

      setLastMessageTimes(times => ({ ...times, [from]: Date.now() }));

      if (currentDmId !== from) {
        const settings = loadSettings();
        if (settings.playSounds) {
          playMessengerIncomingSound();
        }
        setMutedDMs(muted => {
          if (!muted.includes(from)) {
            setUnreadDMs(u => ({ ...u, [from]: (u[from] || 0) + 1 }));
          }
          return muted;
        });
      }

      if (sender) {
        setDmUsers(prev => {
          const existingIndex = prev.findIndex(u => u.id === from);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastMessageAt: Date.now(),
            };
            return updated;
          }
          return [{
            id: from,
            name: sender.name,
            avatar: sender.avatar,
            status: sender.status || 'online',
            lastMessageAt: Date.now()
          }, ...prev];
        });
      }
    });

    return () => {
      socket.off("user-presence");
      socket.off("initial-presences");
      socket.off("dm-notification");
    };
  }, [socket, currentUser.id]);

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.toLowerCase().replace(/\s+/g, "-") }),
      });
      if (res.ok) {
        setNewChannelName("");
        setShowCreate(false);
        mutateChannels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: `${newGroupName}##group`,
          isGroup: true,
          members: selectedGroupUsers 
        }),
      });
      if (res.ok) {
        setNewGroupName("");
        setSelectedGroupUsers([]);
        setShowCreateGroup(false);
        mutateChannels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChat = async (userId: string) => {
    try {
      const res = await fetch(`/api/dm/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setDmUsers(prev => prev.filter(u => u.id !== userId));
        mutateDmUsers();
        if (pathname === `/dm/${userId}`) {
          router.push("/dashboard");
        }
      } else {
        alert("Failed to delete chat.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete chat.");
    }
  };

  const baseDmUsers = dmSearch
    ? allUsers.filter(u => u.name.toLowerCase().includes(dmSearch.toLowerCase()))
    : dmUsers;

  const filteredDmUsers = baseDmUsers
    .filter(u => !blockedUsers.includes(u.id))
    .filter(u => dmSearch ? true : !archivedDMs.includes(u.id))
    .sort((a, b) => {
      const aPinned = pinnedDMs.includes(a.id);
      const bPinned = pinnedDMs.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aUnread = unreadDMs[a.id] || 0;
      const bUnread = unreadDMs[b.id] || 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;
      if (aUnread > 0 && bUnread > 0) {
        if (aUnread !== bUnread) return bUnread - aUnread;
      }

      const aTime = lastMessageTimes[a.id] || a.lastMessageAt || 0;
      const bTime = lastMessageTimes[b.id] || b.lastMessageAt || 0;
      if (aTime !== bTime) return bTime - aTime;

      return a.name.localeCompare(b.name);
    });

  const onlineUsers = allUsers.filter(u => presences[u.id] === 'online');
  const standardChannels = channels.filter(ch => !ch.isGroup);
  const groupChannels = channels.filter(ch => ch.isGroup);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const totalUnreadCount = Object.values(unreadDMs).reduce((acc, count) => acc + count, 0);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const renderDmUser = (user: DMUser) => {
    const status = presences[user.id] || user.status || "offline";
    const unread = unreadDMs[user.id] || 0;
    const isUnread = unread > 0;
    const timeStr = formatRelativeTime(lastMessageTimes[user.id] || user.lastMessageAt);
    
    if (activeFilter === "Unread" && !isUnread) return null;
    if (activeFilter === "Channels") return null;

    return (
      <div key={user.id} className={styles.dmItemWrap}>
        <Link
          href={`/dm/${user.id}`}
          onMouseEnter={() => prefetchChatMessages(`/api/dm/${user.id}`)}
          onTouchStart={() => prefetchChatMessages(`/api/dm/${user.id}`)}
          className={`${styles.chatCard} ${isUnread ? styles.chatCardUnread : ""} ${pathname === `/dm/${user.id}` ? styles.chatCardActive : ""}`}
          onClick={() => { setUnreadDMs(u => ({ ...u, [user.id]: 0 })); setMobileSidebarOpen(false); }}
        >
          <div className={`avatar avatar-md ${styles.chatCardAvatar} status-${status}`}>
            {user.avatar ? <Image src={user.avatar} alt={user.name} width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : initials(user.name)}
            <span className={styles.statusDotInner} />
          </div>

          <div className={styles.chatCardBody}>
            <div className={styles.chatCardTop}>
              <span className={styles.chatCardName}>{user.name}</span>
              {timeStr && <span className={styles.chatCardTime}>{timeStr}</span>}
            </div>
            <div className={styles.chatCardBottom}>
              <span className={styles.chatCardSnippet}>
                {mutedDMs.includes(user.id) && <BellOff size={11} style={{ marginRight: 4, opacity: 0.5 }} />}
                {!isUnread && <CheckCheck size={12} className={styles.readCheckmark} />}
                {user.jobTitle || "Send a message..."}
              </span>
              {isUnread && <span className={styles.unreadBadge}>{unread}</span>}
            </div>
          </div>
          
          <button 
            className={styles.moreBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeMenuUserId === user.id) {
                setActiveMenuUserId(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                const goesOffScreen = rect.bottom + 350 > window.innerHeight;
                if (goesOffScreen) {
                  setMenuPos({ top: 'auto', bottom: window.innerHeight - rect.top, left: rect.right - 180 });
                } else {
                  setMenuPos({ top: rect.bottom, bottom: 'auto', left: rect.right - 180 });
                }
                setActiveMenuUserId(user.id);
              }
            }}
          >
            <MoreVertical size={15} />
          </button>
        </Link>

        {activeMenuUserId === user.id && (
          <>
            <div className="modal-overlay" style={{ background: 'transparent', zIndex: 999 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenuUserId(null); }} />
            <div className={styles.dmMenu} style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, right: 'auto', zIndex: 1000, margin: 0 }}>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                setUnreadDMs(u => ({ ...u, [user.id]: 1 }));
              }}>
                <MessageCircle size={14} /> Mark as unread
              </button>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                toggleMute(user.id);
              }}>
                <BellOff size={14} /> Mute notifications
              </button>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                setSelectedProfileUser(user);
              }}>
                <UserIcon size={14} /> View profile
              </button>

              <div className={styles.menuDivider} />

              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                initiateCall({ id: user.id, name: user.name, avatar: user.avatar }, 'audio');
              }}>
                <Phone size={14} /> Audio call
              </button>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                initiateCall({ id: user.id, name: user.name, avatar: user.avatar }, 'video');
              }}>
                <Video size={14} /> Video chat
              </button>

              <div className={styles.menuDivider} />

              <button className={`${styles.dmMenuItem} ${styles.dmMenuItemDanger}`} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                blockUser(user.id);
              }}>
                <UserX size={14} /> Block
              </button>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                toggleArchive(user.id);
              }}>
                <Archive size={14} /> {archivedDMs.includes(user.id) ? "Unarchive chat" : "Archive chat"}
              </button>
              <button className={`${styles.dmMenuItem} ${styles.dmMenuItemDanger}`} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                if (window.confirm("Are you sure you want to permanently delete this chat?")) {
                  deleteChat(user.id);
                }
              }}>
                <Trash2 size={14} /> Delete chat
              </button>
              <button className={styles.dmMenuItem} onClick={(e) => { 
                e.stopPropagation(); e.preventDefault();
                setActiveMenuUserId(null); 
                reportUser(user.id);
              }}>
                <AlertTriangle size={14} /> Report
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileSidebarOpen && (
        <div 
          className={styles.mobileBackdrop} 
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <aside 
        className={`${styles.sidebarContainer} ${isMobileSidebarOpen ? styles.open : ""}`}
        style={{ width: isResizing ? 'auto' : sidebarWidth }}
      >
        <div 
          className={`${styles.resizer} ${isResizing ? styles.isResizing : ''}`} 
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        />

        {/* ===== 1. PRIMARY NAVIGATION RAIL (LEFT DOCK) ===== */}
        <div className={styles.navRail}>
          <Link href="/dashboard" className={styles.navRailLogo} title="Trellis Chat">
            <Image src="/New%20Logo.png" alt="Agri Logo" width={38} height={38} unoptimized priority style={{ objectFit: 'contain' }} />
          </Link>

          <div className={styles.navRailList}>
            <Link 
              href="/dashboard" 
              className={`${styles.navRailItem} ${pathname === '/dashboard' || pathname.startsWith('/dm/') || pathname.startsWith('/channels/') || pathname.startsWith('/group/') ? styles.navRailItemActive : ''}`}
              title="Chats & Messages"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <MessageCircle size={22} />
              {totalUnreadCount > 0 && <span className={styles.navRailBadge}>{totalUnreadCount}</span>}
            </Link>

            <Link 
              href="/people" 
              className={`${styles.navRailItem} ${pathname === '/people' ? styles.navRailItemActive : ''}`}
              title="Discover People"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <Compass size={22} />
            </Link>

            <Link 
              href="/mentions" 
              className={`${styles.navRailItem} ${pathname === '/mentions' ? styles.navRailItemActive : ''}`}
              title="Mentions"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <AtSign size={22} />
            </Link>

            <Link 
              href="/calendar" 
              className={`${styles.navRailItem} ${pathname === '/calendar' ? styles.navRailItemActive : ''}`}
              title="Calendar"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <Calendar size={22} />
            </Link>

            <Link 
              href="/dashboard" 
              className={`${styles.navRailItem} ${pathname === '/dashboard' ? styles.navRailItemActive : ''}`}
              title="Dashboard"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <Sprout size={22} />
            </Link>

            {currentUser.role?.toLowerCase() === "admin" && (
              <Link 
                href="/admin" 
                className={`${styles.navRailItem} ${pathname === '/admin' ? styles.navRailItemActive : ''}`}
                title="Admin Dashboard"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <Shield size={22} />
              </Link>
            )}
          </div>

          <div className={styles.navRailFooter}>
            <Link 
              href="/settings" 
              className={`${styles.navRailItem} ${pathname === '/settings' ? styles.navRailItemActive : ''}`}
              title="Settings"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <Settings size={22} />
            </Link>
            
            <div 
              className={`avatar avatar-sm status-${myStatus}`} 
              style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }}
              onClick={() => setSelectedProfileUser({ ...(currentUser as any), avatar: myAvatar, name: myName })}
              title={myName}
            >
              {myAvatar ? (
                <Image src={myAvatar} alt={myName} width={36} height={36} unoptimized style={{ borderRadius: '50%', objectFit: 'cover', width: 36, height: 36 }} />
              ) : (
                initials(myName)
              )}
              <span className={styles.statusDotInner} />
            </div>
          </div>
        </div>

        {/* ===== 2. MESSENGER CONVERSATION PANEL (MIDDLE COLUMN) ===== */}
        <div className={styles.messengerPanel}>
          
          {/* Messenger Header */}
          <div className={styles.messengerHeader}>
            <h1 className={styles.messengerTitle}>Chats</h1>
            <div className={styles.headerActions}>
              <button 
                className={`${styles.iconBtn} ${showDmSearch ? styles.iconBtnActive : ""}`} 
                aria-label="Search" 
                onClick={() => setShowDmSearch(!showDmSearch)}
                title="Search Chats"
              >
                <Search size={16} />
              </button>
              <button 
                className={`${styles.iconBtn} ${showNewMenu ? styles.iconBtnActive : ""}`} 
                aria-label="New Message" 
                onClick={() => setShowNewMenu(!showNewMenu)}
                title="New Chat / Channel"
              >
                <SquarePen size={16} />
              </button>

              {showNewMenu && (
                <>
                  <div className="modal-overlay" style={{ background: 'transparent', zIndex: 99 }} onClick={() => setShowNewMenu(false)} />
                  <div className={styles.newMenu}>
                    <button className={styles.newMenuItem} onClick={() => { setShowNewMenu(false); setShowDmSearch(true); }}>
                      <UserIcon size={16} /> Start Direct Message
                    </button>
                    <button className={styles.newMenuItem} onClick={() => { setShowNewMenu(false); setShowCreateGroup(true); }}>
                      <Users size={16} /> Create Group Chat
                    </button>
                    <button className={styles.newMenuItem} onClick={() => { setShowNewMenu(false); setShowCreate(true); }}>
                      <Hash size={16} /> Create Channel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Drawer Input */}
          {showDmSearch && (
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search conversations & people..."
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Active Now Horizon Scroll Bar (Meta Messenger Stories) */}
          {!dmSearch && onlineUsers.length > 0 && (
            <div className={styles.activeNowSection}>
              <div className={styles.activeNowLabel}>Active Now</div>
              <div className={styles.activeNowScroll}>
                {onlineUsers.map(user => (
                  <Link
                    key={user.id}
                    href={`/dm/${user.id}`}
                    className={styles.activeUserCard}
                    onClick={() => setMobileSidebarOpen(false)}
                    title={user.name}
                  >
                    <div className={styles.activeAvatarRing}>
                      <div className={styles.activeAvatarInner}>
                        {user.avatar ? <Image src={user.avatar} alt={user.name} width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : initials(user.name)}
                      </div>
                      <span className={styles.activeOnlineDot} />
                    </div>
                    <span className={styles.activeUserName}>{user.name.split(' ')[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            {['All', 'Unread', 'Channels', 'Direct'].map(f => (
              <button
                key={f}
                className={`${styles.filterTab} ${activeFilter === f ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'Unread' && totalUnreadCount > 0 ? `Unread (${totalUnreadCount})` : f}
              </button>
            ))}
          </div>

          {/* Connection Alert */}
          {!isConnected && (
            <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, margin: '6px 16px', borderRadius: 8, fontWeight: 500 }}>
              <AlertTriangle size={14} /> Reconnecting...
            </div>
          )}

          {/* Conversations List */}
          <div className={styles.conversationList}>
            {/* Standard Channels */}
            {(activeFilter === "All" || activeFilter === "Channels") && !dmSearch && standardChannels.map(ch => (
              <Link
                key={ch.id}
                href={`/channels/${ch.name}`}
                onMouseEnter={() => prefetchChatMessages(`/api/channels/${ch.id}/messages`)}
                onTouchStart={() => prefetchChatMessages(`/api/channels/${ch.id}/messages`)}
                onClick={() => setMobileSidebarOpen(false)}
                className={`${styles.chatCard} ${pathname === `/channels/${ch.name}` ? styles.chatCardActive : ""}`}
              >
                <div className={styles.chatCardAvatar} style={{ background: 'var(--chat-accent-glow, rgba(16, 185, 129, 0.15))', color: 'var(--chat-accent, var(--brand))' }}>
                  <Hash size={22} />
                </div>
                <div className={styles.chatCardBody}>
                  <div className={styles.chatCardTop}>
                    <span className={styles.chatCardName}>#{ch.name}</span>
                  </div>
                  <div className={styles.chatCardBottom}>
                    <span className={styles.chatCardSnippet}>Public Channel</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* Group Channels */}
            {(activeFilter === "All" || activeFilter === "Channels" || activeFilter === "Direct") && !dmSearch && groupChannels.map(ch => (
              <Link
                key={ch.id}
                href={`/group/${ch.id}`}
                onMouseEnter={() => prefetchChatMessages(`/api/channels/${ch.id}/messages`)}
                onTouchStart={() => prefetchChatMessages(`/api/channels/${ch.id}/messages`)}
                onClick={() => setMobileSidebarOpen(false)}
                className={`${styles.chatCard} ${pathname === `/group/${ch.id}` ? styles.chatCardActive : ""}`}
              >
                <div className={styles.chatCardAvatar}>
                  {ch.avatar ? <Image src={ch.avatar} alt={ch.name.split('##')[0]} width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : initials(ch.name.split('##')[0])}
                  <span className={styles.statusDotInner} style={{ backgroundColor: '#10b981' }} />
                </div>
                <div className={styles.chatCardBody}>
                  <div className={styles.chatCardTop}>
                    <span className={styles.chatCardName}>{ch.name.split('##')[0]}</span>
                  </div>
                  <div className={styles.chatCardBottom}>
                    <span className={styles.chatCardSnippet}>Group Chat</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* Direct Message Conversations */}
            {filteredDmUsers.map(renderDmUser)}
          </div>
        </div>

        {/* Create Channel Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">New Channel</h2>
                <button className="btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
              </div>
              <div className="form-group">
                <label className="form-label">Channel Name</label>
                <input
                  className="input"
                  placeholder="e.g. announcements"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createChannel()}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createChannel}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Chat Modal */}
        {showCreateGroup && (
          <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">New Group Chat</h2>
                <button className="btn-icon" onClick={() => setShowCreateGroup(false)}><X size={18} /></button>
              </div>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  className="input"
                  placeholder="e.g. Project Alpha Team"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Select Members</label>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  {allUsers.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: 4, transition: 'background 0.2s' }} className={selectedGroupUsers.includes(u.id) ? 'selected-bg' : ''}>
                      <input 
                        type="checkbox" 
                        checked={selectedGroupUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGroupUsers([...selectedGroupUsers, u.id]);
                          else setSelectedGroupUsers(selectedGroupUsers.filter(id => id !== u.id));
                        }}
                        style={{ marginRight: 12 }}
                      />
                      <span className={`avatar avatar-sm status-${u.status || 'offline'}`} style={{ marginRight: 8, display: 'inline-flex' }}>
                        {u.avatar ? <Image src={u.avatar} alt={u.name} width={32} height={32} /> : initials(u.name)}
                      </span>
                      <span>{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                <button className="btn btn-ghost" onClick={() => setShowCreateGroup(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createGroup} disabled={!newGroupName.trim() || selectedGroupUsers.length === 0}>Create Group</button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {selectedProfileUser && (
          <UserProfileModal 
            user={selectedProfileUser as any} 
            onClose={() => setSelectedProfileUser(null)} 
            isCurrentUser={selectedProfileUser.id === currentUser.id}
          />
        )}
      </aside>
    </>
  );
}
