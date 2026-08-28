"use client";

import { useState, useEffect } from "react";
import { X, Shield, User as UserIcon, Trash2, Settings, UserMinus, Crown } from "lucide-react";
import Image from "next/image";

interface ChannelMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface ChannelSettingsModalProps {
  channelId: string;
  currentUserId: string;
  onClose: () => void;
}

export default function ChannelSettingsModal({ channelId, currentUserId, onClose }: ChannelSettingsModalProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState("member");
  
  useEffect(() => {
    fetchMembers();
  }, [channelId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}`);
      const data = await res.json();
      if (data.channel) {
        setMembers(data.channel.members);
        const me = data.channel.members.find((m: any) => m.userId === currentUserId);
        if (me) setMyRole(me.role);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role: newRole } : m));
      } else {
        alert(await res.text());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const kickMember = async (userId: string) => {
    if (!confirm("Are you sure you want to kick this user?")) return;
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.user.id !== userId));
      } else {
        alert(await res.text());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={20} /> Channel Settings
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)' }}>Members ({members.length})</h3>
          
          {loading ? (
            <div>Loading members...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar avatar-md">
                      {member.user.avatar ? <Image src={member.user.avatar} alt="" width={32} height={32} /> : member.user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>
                        {member.user.name} {member.user.id === currentUserId && "(You)"}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{member.role}</div>
                    </div>
                  </div>

                  {/* Actions based on myRole */}
                  {myRole === "admin" && member.user.id !== currentUserId && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select 
                        value={member.role}
                        onChange={(e) => updateRole(member.user.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => kickMember(member.user.id)} title="Kick User">
                        <UserMinus size={16} />
                      </button>
                    </div>
                  )}

                  {myRole === "moderator" && member.role === "member" && member.user.id !== currentUserId && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => kickMember(member.user.id)} title="Kick User">
                        <UserMinus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
