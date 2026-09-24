"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MessageCircle, Mail, Briefcase, Building2, Users } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import UserAvatar from "@/components/UserAvatar";
import styles from "./people.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
  role: string;
}

export default function PeoplePage() {
  const { socket } = useSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterDiv, setFilterDiv] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/users${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      setUsers(data.users || []);
      setLoading(false);
    }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!socket) return;

    const handlePresence = ({ userId, status }: { userId: string; status: string }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    };

    const handleInitialPresences = (initialMap: Record<string, string>) => {
      setUsers(prev => prev.map(u => ({ ...u, status: initialMap[u.id] || "offline" })));
    };

    socket.on("user-presence", handlePresence);
    socket.on("initial-presences", handleInitialPresences);

    return () => {
      socket.off("user-presence", handlePresence);
      socket.off("initial-presences", handleInitialPresences);
    };
  }, [socket]);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getFirstName = (name: string) => name.split(" ")[0] || name;

  const divisions = [...new Set(users.map(u => u.department).filter(Boolean))];
  const units = [...new Set(users.map(u => u.unit).filter(Boolean))];
  
  const filtered = users.filter(u => {
    const divMatch = filterDiv === "all" || u.department === filterDiv;
    const unitMatch = filterUnit === "all" || u.unit === filterUnit;
    return divMatch && unitMatch;
  });
  
  const onlineUsers = users.filter(u => u.status === "online");

  return (
    <div className={styles.peoplePage}>
      {/* Header */}
      <div className={styles.peopleHeader}>
        <div>
          <h1 className={styles.peopleTitle}>
            <Users size={24} style={{ color: "var(--brand)" }} />
            People
          </h1>
          <p className={styles.peopleSub}>
            {users.length} members · <span className={styles.onlineCount}>{onlineUsers.length} online</span>
          </p>
        </div>

        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            id="people-search"
            className={styles.searchInput}
            placeholder="Search colleagues..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Active Now Carousel (Messenger Style) */}
      {!loading && onlineUsers.length > 0 && (
        <div className={styles.activeSection}>
          <div className={styles.activeSectionHeader}>
            <span className={styles.activeTitle}>
              <span className={styles.activeDot} />
              Active Now ({onlineUsers.length})
            </span>
          </div>

          <div className={styles.activeTrack}>
            {onlineUsers.map(user => (
              <Link key={user.id} href={`/dm/${user.id}`} className={styles.activeUserCard} title={`Chat with ${user.name}`}>
                <div className={styles.activeAvatarWrap}>
                  <UserAvatar src={user.avatar} name={user.name} size={54} className={styles.activeAvatar} />
                  <div className={styles.activeStatusBadge} />
                </div>
                <span className={styles.activeUserName}>{getFirstName(user.name)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {(divisions.length > 0 || units.length > 0) && (
        <div className={styles.filtersSection}>
          {divisions.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Division:</span>
              <button
                className={`${styles.filterBtn} ${filterDiv === "all" ? styles.filterBtnActive : ""}`}
                onClick={() => setFilterDiv("all")}
              >
                All
              </button>
              {divisions.map(div => (
                <button
                  key={div}
                  className={`${styles.filterBtn} ${filterDiv === div ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilterDiv(div!)}
                >
                  {div}
                </button>
              ))}
            </div>
          )}

          {units.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Unit:</span>
              <button
                className={`${styles.filterBtn} ${filterUnit === "all" ? styles.filterBtnActive : ""}`}
                onClick={() => setFilterUnit("all")}
              >
                All
              </button>
              {units.map(unit => (
                <button
                  key={unit}
                  className={`${styles.filterBtn} ${filterUnit === unit ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilterUnit(unit!)}
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts List Header */}
      <div className={styles.sectionHeader}>
        All Members ({filtered.length})
      </div>

      {/* Employee List Grid */}
      {loading ? (
        <div className={styles.peopleGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={`skeleton ${styles.skelAvatar}`} />
              <div className={styles.skelTextWrap}>
                <div className={`skeleton ${styles.skelLine1}`} />
                <div className={`skeleton ${styles.skelLine2}`} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Users size={40} />
          <p>No members found</p>
        </div>
      ) : (
        <div className={styles.peopleGrid}>
          {filtered.map(user => {
            const statusClass =
              user.status === "online"
                ? styles.statusDotOnline
                : user.status === "away"
                ? styles.statusDotAway
                : styles.statusDotOffline;

            const details = [user.jobTitle, user.department || user.unit, user.email].filter(Boolean).join(" · ");

            return (
              <Link key={user.id} href={`/dm/${user.id}`} className={styles.contactRow}>
                <div className={styles.rowLeft}>
                  <div className={styles.avatarWrap}>
                    <UserAvatar src={user.avatar} name={user.name} size={48} className={styles.avatarImg} />
                    <div className={`${styles.statusDot} ${statusClass}`} />
                  </div>

                  <div className={styles.contactMeta}>
                    <div className={styles.nameRow}>
                      <span className={styles.contactName}>{user.name}</span>
                      {user.role === "admin" && <span className={styles.roleBadge}>Admin</span>}
                    </div>
                    {user.jobTitle ? (
                      <span className={styles.contactSubtitle}>{user.jobTitle}</span>
                    ) : (
                      <span className={styles.contactSubtitle}>{user.email}</span>
                    )}
                    {(user.department || user.unit) && (
                      <span className={styles.contactDetails}>
                        {[user.department, user.unit].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <div className={styles.messageCircleBtn} title={`Message ${user.name}`}>
                    <MessageCircle size={18} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
