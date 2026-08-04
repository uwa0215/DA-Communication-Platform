"use client";

import { useEffect, useState } from "react";
import { Check, X, Shield, Clock, ShieldAlert, Trash2 } from "lucide-react";
import styles from "./admin.module.css";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
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

  if (loading) return <div className={styles.adminPage}><div className="spinner" /></div>;

  const pendingUsers = users.filter(u => !u.isApproved);
  const activeUsers = users.filter(u => u.isApproved);

  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <h1><Shield size={28} /> Admin Dashboard</h1>
        <p>Manage employee access and approvals.</p>
        {errorMsg && <div style={{ color: '#ef4444', marginTop: 10, padding: 10, background: '#fee2e2', borderRadius: 8 }}>{errorMsg}</div>}
      </div>

      <div className={styles.section}>
        <h2><Clock size={20} /> Pending Approvals ({pendingUsers.length})</h2>
        {pendingUsers.length === 0 ? (
          <div className={styles.empty}>No pending approvals.</div>
        ) : (
          <div className={styles.grid}>
            {pendingUsers.map(u => (
              <div key={u.id} className={styles.card}>
                <div className={styles.info}>
                  <h3>{u.name}</h3>
                  <p>{u.email}</p>
                  <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div className={styles.actions}>
                  <button className="btn btn-primary" onClick={() => approveUser(u.id)}>
                    <Check size={16} /> Approve
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteUser(u.id)}>
                    {confirmingId === u.id ? "Click again to confirm" : <><X size={16} /> Reject</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2><ShieldAlert size={20} /> Active Employees ({activeUsers.length})</h2>
        <div className={styles.grid}>
          {activeUsers.map(u => (
            <div key={u.id} className={styles.card}>
              <div className={styles.info}>
                <h3>{u.name} {u.role === "admin" && <span className={styles.badge}>Admin</span>}</h3>
                <p>{u.email}</p>
              </div>
              <div className={styles.actions}>
                <button className="btn btn-danger" onClick={() => deleteUser(u.id)}>
                  {confirmingId === u.id ? "Click to confirm deletion" : <><Trash2 size={16} /> Delete Account</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
