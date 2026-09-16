"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, XCircle, Shield, Clock, ShieldAlert, Trash2, Search, MessageCircle, UserCheck, ShieldCheck } from "lucide-react";
import styles from "./admin.module.css";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
  role: string;
  isApproved: boolean;
  jobTitle?: string;
  department?: string;
  unit?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Failed to fetch users (status: ${res.status})`);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Network error fetching users");
    }
    setLoading(false);
  }

  async function approveUser(id: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    });
    if (res.ok) fetchUsers();
  }

  async function toggleRole(id: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle-role" }),
    });
    if (res.ok) fetchUsers();
  }

  async function deleteUser(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setErrorMsg("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    if (res.ok) {
      setConfirmingId(null);
      fetchUsers();
    } else {
      const data = await res.json();
      setErrorMsg(data.error || "Failed to delete user");
      setConfirmingId(null);
    }
  }

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.role === "admin") ||
      (roleFilter === "member" && u.role !== "admin");

    return matchesSearch && matchesRole;
  });

  const pendingUsers = filteredUsers.filter(u => !u.isApproved);
  const activeUsers = filteredUsers.filter(u => u.isApproved);

  return (
    <div className={styles.adminPage}>
      {/* Header */}
      <div className={styles.adminHeader}>
        <div>
          <h1 className={styles.adminTitle}>
            <Shield size={24} style={{ color: "var(--brand)" }} />
            Admin Dashboard
          </h1>
          <p className={styles.adminSub}>
            Manage employee access, approvals, and system permissions.
          </p>
        </div>

        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {errorMsg && (
        <div className={styles.errorAlert}>
          {errorMsg}
        </div>
      )}

      {/* Pending Approvals */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Clock size={16} style={{ color: "#f59e0b" }} />
          Pending Approvals
          <span className={styles.badgePending}>{pendingUsers.length}</span>
        </div>

        {loading ? (
          <div className={styles.contactsGrid}>
            <div className={styles.empty}>Loading pending requests...</div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className={styles.empty}>No pending approvals at this time.</div>
        ) : (
          <div className={styles.contactsGrid}>
            {pendingUsers.map(u => (
              <div key={u.id} className={styles.contactRow}>
                <div className={styles.rowLeft}>
                  <div className={styles.avatarWrap}>
                    {u.avatar ? (
                      <Image src={u.avatar} alt={u.name} width={48} height={48} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>{initials(u.name)}</div>
                    )}
                  </div>

                  <div className={styles.contactMeta}>
                    <div className={styles.nameRow}>
                      <span className={styles.contactName}>{u.name}</span>
                      <span className={styles.roleBadgeMember}>Pending</span>
                    </div>
                    <span className={styles.contactSubtitle}>{u.email}</span>
                    <span className={styles.contactDetails}>Requested {new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <button className={styles.approveBtn} onClick={() => approveUser(u.id)} title="Approve Employee">
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button className={styles.rejectBtn} onClick={() => deleteUser(u.id)} title="Reject Request">
                    {confirmingId === u.id ? "Confirm?" : <><XCircle size={15} /> Reject</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Employees */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <ShieldCheck size={16} style={{ color: "var(--brand)" }} />
          Active Employees
          <span className={styles.badgeActive}>{activeUsers.length}</span>
        </div>

        {loading ? (
          <div className={styles.contactsGrid}>
            <div className={styles.empty}>Loading employees...</div>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className={styles.empty}>No active employees found matching search.</div>
        ) : (
          <div className={styles.contactsGrid}>
            {activeUsers.map(u => {
              const statusClass =
                u.status === "online"
                  ? styles.statusDotOnline
                  : u.status === "away"
                  ? styles.statusDotAway
                  : styles.statusDotOffline;

              return (
                <div key={u.id} className={styles.contactRow}>
                  <div className={styles.rowLeft}>
                    <div className={styles.avatarWrap}>
                      {u.avatar ? (
                        <Image src={u.avatar} alt={u.name} width={48} height={48} className={styles.avatarImg} />
                      ) : (
                        <div className={styles.avatarFallback}>{initials(u.name)}</div>
                      )}
                      <div className={`${styles.statusDot} ${statusClass}`} />
                    </div>

                    <div className={styles.contactMeta}>
                      <div className={styles.nameRow}>
                        <span className={styles.contactName}>{u.name}</span>
                        {u.role === "admin" ? (
                          <span className={styles.roleBadgeAdmin}>Admin</span>
                        ) : (
                          <span className={styles.roleBadgeMember}>Member</span>
                        )}
                      </div>
                      <span className={styles.contactSubtitle}>{u.jobTitle || u.email}</span>
                      {(u.department || u.unit) && (
                        <span className={styles.contactDetails}>
                          {[u.department, u.unit].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.rowRight}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteUser(u.id)}
                      title="Delete User Account"
                    >
                      {confirmingId === u.id ? "Confirm Delete" : <Trash2 size={14} />}
                    </button>

                    <Link href={`/dm/${u.id}`} className={styles.msgBtn} title={`Chat with ${u.name}`}>
                      <MessageCircle size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
