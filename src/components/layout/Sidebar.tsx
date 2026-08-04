"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Hash, MessageCircle, Users, Plus, ChevronDown, ChevronRight,
  Settings, LogOut, Search, Bell, BellOff, Sprout, Shield, MoreVertical,
  User as UserIcon, Pin, Video, Ban, Phone,
  Filter, SquarePen, AtSign, Compass, Calendar
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import UserProfileModal from "@/components/chat/UserProfileModal";
import styles from "./Sidebar.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: string;
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
}

interface SidebarProps {
  currentUser: User;
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { socket } = useSocket();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmUsers, setDmUsers] = useState<DMUser[]>([]);
  const [allUsers, setAllUsers] = useState<DMUser[]>([]);
  
  const [activeFilter, setActiveFilter] = useState("All"); // All, Unread, Channels, Chats

  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [dmSearch, setDmSearch] = useState("");
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const [presences, setPresences] = useState<Record<string, string>>({});
  const [myStatus, setMyStatus] = useState<string>(currentUser.status || "online");

  // Resize State
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  // Persisted preferences
  const [pinnedDMs, setPinnedDMs] = useState<string[]>([]);
  const [mutedDMs, setMutedDMs] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  // Overlays
  const [selectedProfileUser, setSelectedProfileUser] = useState<DMUser | null>(null);
  const [videoCallingUser, setVideoCallingUser] = useState<DMUser | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("agritalk_pinnedDMs");
      if (p) setPinnedDMs(JSON.parse(p));
      const m = localStorage.getItem("agritalk_mutedDMs");
      if (m) setMutedDMs(JSON.parse(m));
      const b = localStorage.getItem("agritalk_blockedUsers");
      if (b) setBlockedUsers(JSON.parse(b));
      const w = localStorage.getItem("agritalk_sidebar_width");
      if (w) setSidebarWidth(parseInt(w, 10));
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!isResizing && sidebarWidth !== 280) {
      localStorage.setItem("agritalk_sidebar_width", sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      setSidebarWidth(Math.min(Math.max(e.clientX, 240), 500));
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
      localStorage.setItem("agritalk_pinnedDMs", JSON.stringify(next));
      return next;
    });
  };

  const toggleMute = (id: string) => {
    setMutedDMs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("agritalk_mutedDMs", JSON.stringify(next));
      return next;
    });
  };

  const blockUser = (id: string) => {
    setBlockedUsers(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("agritalk_blockedUsers", JSON.stringify(next));
      return next;
    });
  };

  const fetchChannels = useCallback(async () => {
    const res = await fetch("/api/channels");
    const data = await res.json();
    if (data.channels) setChannels(data.channels);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.users) {
      const others = data.users.filter((u: DMUser) => u.id !== currentUser.id);
      setAllUsers(others);
      const p: Record<string, string> = {};
      data.users.forEach((u: DMUser) => { p[u.id] = u.status; });
      setPresences(p);
    }
  }, [currentUser.id]);

  const fetchDmUsers = useCallback(async () => {
    const res = await fetch("/api/users/dms");
    const data = await res.json();
    if (data.users) {
      setDmUsers(data.users);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchUsers();
    fetchDmUsers();

    fetch("/api/users/presence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online" }),
    });
    setMyStatus("online");
  }, [fetchChannels, fetchUsers, fetchDmUsers]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-user", currentUser.id);

    socket.on("user-presence", ({ userId, status }: { userId: string; status: string }) => {
      setPresences(p => ({ ...p, [userId]: status }));
    });

    socket.on("dm-notification", ({ from }: { from: string }) => {
      setMutedDMs(muted => {
        if (!muted.includes(from)) {
          setUnreadDMs(u => ({ ...u, [from]: (u[from] || 0) + 1 }));
        }
        return muted;
      });
    });

    return () => {
      socket.off("user-presence");
      socket.off("dm-notification");
    };
  }, [socket, currentUser.id]);

  useEffect(() => {
    const match = pathname.match(/\/dm\/(.+)/);
    if (match) {
      const dmId = match[1];
      setTimeout(() => {
        setUnreadDMs(u => {
          if (u[dmId] !== 0) return { ...u, [dmId]: 0 };
          return u;
        });
      }, 0);
    }
  }, [pathname]);

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName, isGroup: false }),
    });
    if (res.ok) {
      setNewChannelName("");
      setShowCreate(false);
      fetchChannels();
    }
  }

  async function createGroup() {
    if (!newGroupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, isGroup: true, isPrivate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const groupId = data.channel?.id;
        if (!groupId) throw new Error("No group ID returned from server");
        
        const patchRes = await fetch(`/api/channels/${groupId}/group`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIdsToAdd: selectedGroupUsers }),
        });
        
        if (!patchRes.ok) {
           const patchErr = await patchRes.json();
           console.error("Patch error:", patchErr);
           alert("Group created but failed to add users: " + (patchErr.error || "Unknown error"));
        }
        
        setNewGroupName("");
        setSelectedGroupUsers([]);
        setShowCreateGroup(false);
        fetchChannels();
      } else {
        const err = await res.json();
        alert("Failed to create group: " + (err.error || "Unknown error"));
      }
    } catch (error: any) {
      console.error(error);
      alert("Network or client error: " + error.message);
    }
  }

  const baseDmUsers = dmSearch
    ? allUsers.filter(u => u.name.toLowerCase().includes(dmSearch.toLowerCase()))
    : dmUsers;

  const filteredDmUsers = baseDmUsers
    .filter(u => !blockedUsers.includes(u.id))
    .sort((a, b) => {
      const aPinned = pinnedDMs.includes(a.id);
      const bPinned = pinnedDMs.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const favorites = filteredDmUsers.filter(u => pinnedDMs.includes(u.id));
  const regularDms = filteredDmUsers.filter(u => !pinnedDMs.includes(u.id));
  
  const standardChannels = channels.filter(ch => !ch.isGroup);
  const groupChannels = channels.filter(ch => ch.isGroup);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const renderDmUser = (user: DMUser) => {
    const status = presences[user.id] || user.status || "offline";
    const unread = unreadDMs[user.id] || 0;
    
    // Check if we should render based on activeFilter
    if (activeFilter === "Unread" && unread === 0) return null;

    return (
      <div key={user.id} className={styles.dmItemWrap}>
        <Link
          href={`/dm/${user.id}`}
          className={`${styles.navItem} ${pathname === `/dm/${user.id}` ? styles.navItemActive : ""}`}
          onClick={() => setUnreadDMs(u => ({ ...u, [user.id]: 0 }))}
        >
          <span className={`avatar avatar-sm ${styles.dmAvatar} status-${status}`}>
            {user.avatar ? <img src={user.avatar} alt={user.name} /> : initials(user.name)}
            <span className={styles.statusDotInner} />
          </span>
          <span className={`truncate ${styles.dmName}`}>
            {user.name}
            {mutedDMs.includes(user.id) && <BellOff size={12} style={{marginLeft: 4, opacity: 0.5}} />}
          </span>
          {unread > 0 && <span className={styles.badge}>{unread}</span>}
          
          <span 
            className={`btn-icon ${styles.dmActionBtn}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id);
            }}
            role="button"
            tabIndex={0}
          >
            <MoreVertical size={14} />
          </span>
        </Link>

        {activeMenuUserId === user.id && (
          <>
            <div className="modal-overlay" style={{ background: 'transparent', zIndex: 99 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenuUserId(null); }} />
            <div className={styles.dmMenu}>
              <button className={styles.dmMenuItem} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              setSelectedProfileUser(user);
            }}>
              <UserIcon size={14} /> View Profile
            </button>
            <button className={styles.dmMenuItem} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              togglePin(user.id);
            }}>
              <Pin size={14} /> {pinnedDMs.includes(user.id) ? "Unpin" : "Pin"} from Favorites
            </button>
            <button className={styles.dmMenuItem} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              setUnreadDMs(u => ({ ...u, [user.id]: 1 }));
            }}>
              <MessageCircle size={14} /> Mark as Unread
            </button>
            <button className={styles.dmMenuItem} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              toggleMute(user.id);
            }}>
              <BellOff size={14} /> {mutedDMs.includes(user.id) ? "Unmute" : "Mute"} Notifications
            </button>
            <button className={styles.dmMenuItem} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              setVideoCallingUser(user);
            }}>
              <Video size={14} /> Start Video Call
            </button>
            <div className={styles.menuDivider}></div>
            <button className={`${styles.dmMenuItem} ${styles.dmMenuItemDanger}`} onClick={(e) => { 
              e.stopPropagation(); e.preventDefault();
              setActiveMenuUserId(null); 
              blockUser(user.id);
            }}>
              <Ban size={14} /> Block User
            </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <aside className={styles.sidebar} style={{ width: sidebarWidth }}>
      <div 
        className={`${styles.resizer} ${isResizing ? styles.isResizing : ''}`} 
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      />
      
      {/* Teams-like Header */}
      <div className={styles.sidebarHeader}>
        <h1 className={styles.sidebarTitle}>Chat</h1>
        <div className={styles.sidebarHeaderActions} style={{ position: 'relative' }}>
          <button 
            className={`${styles.headerBtn} ${activeFilter === "Unread" ? styles.headerBtnActive : ""}`} 
            aria-label="Filter" 
            onClick={() => setActiveFilter(activeFilter === "Unread" ? "All" : "Unread")}
          >
            <Filter size={16} />
          </button>
          <button 
            className={`${styles.headerBtn} ${showDmSearch ? styles.headerBtnActive : ""}`} 
            aria-label="Search" 
            onClick={() => {
              setShowDmSearch(!showDmSearch);
              setShowNewMenu(false);
            }}
          >
            <Search size={16} />
          </button>
          <button 
            className={`${styles.headerBtn} ${showNewMenu ? styles.headerBtnActive : ""}`} 
            aria-label="New Chat" 
            onClick={() => {
              setShowNewMenu(!showNewMenu);
              setShowDmSearch(false);
            }}
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

      {/* Filter Pills */}
      <div className={styles.filterPills}>
        {['Unread', 'Channels', 'Chats'].map(f => (
          <button 
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.filterPillActive : ''}`}
            onClick={() => setActiveFilter(activeFilter === f ? 'All' : f)}
          >
            {f}
          </button>
        ))}
      </div>
      
      {showDmSearch && (
        <div className={styles.dmSearchWrap}>
          <Search size={13} className={styles.dmSearchIcon} />
          <input
            className={styles.dmSearch}
            placeholder="Search..."
            value={dmSearch}
            onChange={e => setDmSearch(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <nav className={styles.nav}>
        
        {/* Top Static Actions (Copilot / Mentions style) */}
        {(activeFilter === "All" || activeFilter === "Channels") && !dmSearch && (
          <div className={styles.topActions}>
            <Link href="/dashboard" className={`${styles.navItem} ${styles.navItemStatic} ${pathname === "/dashboard" ? styles.navItemActive : ""}`}>
              <Sprout size={18} className={styles.navIcon} /> <span className={styles.navStaticText}>Dashboard</span>
            </Link>
            <Link href="/people" className={`${styles.navItem} ${styles.navItemStatic} ${pathname === "/people" ? styles.navItemActive : ""}`}>
              <Compass size={18} className={styles.navIcon} /> <span className={styles.navStaticText}>Discover People</span>
            </Link>
            <Link href="/mentions" className={`${styles.navItem} ${styles.navItemStatic} ${pathname === "/mentions" ? styles.navItemActive : ""}`}>
              <AtSign size={18} className={styles.navIcon} /> <span className={styles.navStaticText}>Mentions</span>
            </Link>
            <Link href="/calendar" className={`${styles.navItem} ${styles.navItemStatic} ${pathname === "/calendar" ? styles.navItemActive : ""}`}>
              <Calendar size={18} className={styles.navIcon} /> <span className={styles.navStaticText}>Calendar</span>
            </Link>
          </div>
        )}

        {/* Favorites Section */}
        {(activeFilter === "All" || activeFilter === "Chats") && favorites.length > 0 && !dmSearch && (
          <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setFavoritesOpen(o => !o)}>
              <span className={styles.sectionToggle}>
                {favoritesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className={styles.sectionLabel}>Favorites</span>
            </div>
            {favoritesOpen && (
              <div className={styles.sectionItems}>
                {favorites.map(renderDmUser)}
              </div>
            )}
          </div>
        )}

        {/* Channels Section */}
        {(activeFilter === "All" || activeFilter === "Channels") && !dmSearch && (
          <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setChannelsOpen(o => !o)}>
              <span className={styles.sectionToggle}>
                {channelsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className={styles.sectionLabel}>Channels</span>
              <button className={styles.sectionAdd} onClick={e => { e.stopPropagation(); setShowCreate(true); }}>
                <Plus size={14} />
              </button>
            </div>
            {channelsOpen && (
              <div className={styles.sectionItems}>
                {standardChannels.map(ch => (
                  <Link
                    key={ch.id}
                    href={`/channels/${ch.name}`}
                    className={`${styles.navItem} ${pathname === `/channels/${ch.name}` ? styles.navItemActive : ""}`}
                  >
                    <Hash size={18} className={styles.navIcon} />
                    <span className={`truncate ${styles.channelName}`}>{ch.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Group Chats Section */}
        {(activeFilter === "All" || activeFilter === "Chats") && groupChannels.length > 0 && !dmSearch && (
          <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setGroupsOpen(o => !o)}>
              <span className={styles.sectionToggle}>
                {groupsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className={styles.sectionLabel}>Group Chats</span>
              <button className={styles.sectionAdd} onClick={e => { e.stopPropagation(); setShowCreateGroup(true); }}>
                <Plus size={14} />
              </button>
            </div>
            {groupsOpen && (
              <div className={styles.sectionItems}>
                {groupChannels.map(ch => (
                  <Link
                    key={ch.id}
                    href={`/group/${ch.id}`}
                    className={`${styles.navItem} ${pathname === `/group/${ch.id}` ? styles.navItemActive : ""}`}
                  >
                    <span className={`avatar avatar-sm ${styles.dmAvatar} status-online`} style={{ display: 'inline-flex' }}>
                      {ch.avatar ? <img src={ch.avatar} alt={ch.name.split('##')[0]} /> : initials(ch.name.split('##')[0])}
                      <span className={styles.statusDotInner} />
                    </span>
                    <span className={`truncate ${styles.channelName}`} style={{ marginLeft: 8 }}>{ch.name.split('##')[0]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chats (Direct Messages) Section */}
        {(activeFilter === "All" || activeFilter === "Chats" || activeFilter === "Unread" || dmSearch) && (
          <div className={styles.section}>
            {!dmSearch && (
              <div className={styles.sectionHeader} onClick={() => setDmsOpen(o => !o)}>
                <span className={styles.sectionToggle}>
                  {dmsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={styles.sectionLabel}>Chats</span>
              </div>
            )}
            {(dmsOpen || dmSearch) && (
              <div className={styles.sectionItems}>
                {regularDms.map(renderDmUser)}
                {dmSearch && favorites.map(renderDmUser)}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Create Channel Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Channel</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
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
              <button className="btn-icon" onClick={() => setShowCreateGroup(false)}>✕</button>
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
                        {u.avatar ? <img src={u.avatar} alt={u.name} /> : initials(u.name)}
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

      {/* Mock Video Call Modal */}
      {videoCallingUser && (
        <div className="modal-overlay" style={{ zIndex: 9999999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setVideoCallingUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', animation: 'scalePop 0.3s' }}>
            <div className={`avatar avatar-xl`} style={{ width: 120, height: 120, fontSize: 48, marginBottom: 24, boxShadow: '0 0 0 10px rgba(255,255,255,0.1)', animation: 'pulse 2s infinite' }}>
              {videoCallingUser.avatar ? <img src={videoCallingUser.avatar} alt={videoCallingUser.name} /> : initials(videoCallingUser.name)}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Calling {videoCallingUser.name}...</h2>
            <p style={{ opacity: 0.7, marginBottom: 40 }}>Waiting for them to join</p>
            
            <div style={{ display: 'flex', gap: 20 }}>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: '50%', color: 'white' }}>
                <Video size={24} />
              </button>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: '50%', color: 'white' }}>
                <BellOff size={24} />
              </button>
              <button className="btn-icon" style={{ background: 'var(--status-offline)', width: 56, height: 56, borderRadius: '50%', color: 'white' }} onClick={(e) => { e.stopPropagation(); setVideoCallingUser(null); }}>
                <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
              </button>
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
  );
}
