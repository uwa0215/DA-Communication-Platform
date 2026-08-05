import { X, Mail, Building, Briefcase, Smile, Edit2, Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
  customStatus?: string | null;
}

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  isCurrentUser?: boolean;
}

export default function UserProfileModal({ user, onClose, isCurrentUser }: UserProfileModalProps) {
  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const [editingStatus, setEditingStatus] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState(user.customStatus || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSaveStatus() {
    setSaving(true);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customStatus: customStatusInput })
    });
    setSaving(false);
    setEditingStatus(false);
    user.customStatus = customStatusInput; // Optimistic update
    router.refresh();
  }
  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-panel)', borderRadius: 'var(--r-xl)',
          width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: 'scalePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-sidebar)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Profile</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 20px' }}>
          <div className={`avatar avatar-xl status-${user.status}`} style={{ width: 100, height: 100, fontSize: 36, marginBottom: 16 }}>
            {user.avatar ? <Image src={user.avatar} alt={user.name} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : initials(user.name)}
            <span className="status-dot" style={{ width: 20, height: 20, borderWidth: 4 }} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{user.name}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand)', fontWeight: 600, fontSize: 14 }}>
              <span className={`status-${user.status}`}>
                <span className="status-dot" style={{ position: 'relative', width: 8, height: 8, border: 'none', display: 'inline-block' }} />
              </span>
              <span style={{ textTransform: 'capitalize' }}>{user.status}</span>
            </p>
            
            {editingStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  className="input" 
                  value={customStatusInput} 
                  onChange={e => setCustomStatusInput(e.target.value)}
                  placeholder="What's your status?"
                  style={{ padding: '6px 12px', fontSize: 14, width: 200 }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveStatus()}
                />
                <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={handleSaveStatus} disabled={saving}>
                  {saving ? '...' : <Check size={14} />}
                </button>
                <button className="btn-icon" onClick={() => { setEditingStatus(false); setCustomStatusInput(user.customStatus || ""); }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
                {user.customStatus ? (
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Smile size={14} /> {user.customStatus}
                  </span>
                ) : (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom status</span>
                )}
                {isCurrentUser && (
                  <button className="btn-icon" onClick={() => setEditingStatus(true)} title="Set Status">
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--bg-base)', padding: 20, borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {user.jobTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Briefcase size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Job Title</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{user.jobTitle}</div>
              </div>
            </div>
          )}
          
          {(user.department || user.unit) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Building size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Department</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {user.department} {user.unit && `(${user.unit})`}
                </div>
              </div>
            </div>
          )}

          {user.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Mail size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{user.email}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <a href={`/dm/${user.id}`} className="btn btn-primary" style={{ flex: 1 }}>Message</a>
        </div>
      </div>
    </div>
  );
}
