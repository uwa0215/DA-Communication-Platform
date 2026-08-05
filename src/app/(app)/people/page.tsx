"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MessageCircle, Mail, Briefcase, Building2, Users } from "lucide-react";
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

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const divisions = [...new Set(users.map(u => u.department).filter(Boolean))];
  const units = [...new Set(users.map(u => u.unit).filter(Boolean))];
  
  const filtered = users.filter(u => {
    const divMatch = filterDiv === "all" || u.department === filterDiv;
    const unitMatch = filterUnit === "all" || u.unit === filterUnit;
    return divMatch && unitMatch;
  });
  
  const online = users.filter(u => u.status === "online").length;

  return (
    <div className={styles.peoplePage}>
      {/* Header */}
      <div className={styles.peopleHeader}>
        <div>
          <h1 className={styles.peopleTitle}>
            <Users size={22} />
            People
          </h1>
          <p className={styles.peopleSub}>
            {users.length} members · <span className={styles.onlineCount}>{online} online</span>
          </p>
        </div>

        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            id="people-search"
            className={styles.searchInput}
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {divisions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '60px' }}>Division:</span>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '60px' }}>Unit:</span>
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

      {/* Employee Grid */}
      {loading ? (
        <div className={styles.grid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`skeleton ${styles.skelAvatar}`} />
              <div className={`skeleton ${styles.skelName}`} />
              <div className={`skeleton ${styles.skelTitle}`} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Users size={48} />
          <p>No employees found</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(user => (
            <div key={user.id} className={styles.card}>
              <div className={`avatar avatar-xl status-${user.status} ${styles.cardAvatar}`}>
                {user.avatar
                  ? <Image src={user.avatar} alt={user.name} width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                  : initials(user.name)
                }
                <span className="status-dot" style={{ width: 14, height: 14 }} />
              </div>

              <h3 className={styles.cardName}>{user.name}</h3>

              {user.jobTitle && (
                <p className={styles.cardTitle}>
                  <Briefcase size={12} /> {user.jobTitle}
                </p>
              )}

              {user.department && (
                <p className={styles.cardDept}>
                  <Building2 size={12} /> {user.department}
                </p>
              )}
              
              {user.unit && (
                <p className={styles.cardDept}>
                  <Users size={12} /> {user.unit}
                </p>
              )}

              <p className={styles.cardEmail}>
                <Mail size={12} /> {user.email}
              </p>

              <span className={`${styles.statusBadge} ${styles[`status_${user.status}`]}`}>
                {user.status}
              </span>

              <div className={styles.cardActions}>
                <Link href={`/dm/${user.id}`} className="btn btn-primary" style={{ fontSize: 13, padding: "6px 14px" }}>
                  <MessageCircle size={14} /> Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
