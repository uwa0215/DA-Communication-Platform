"use client";

import { useState, useEffect } from "react";
import { 
  X, Shield, User as UserIcon, Trash2, Settings, UserMinus, Crown, 
  Hash, Lock, Globe, Plus, Save, UserPlus, LogOut, Check, Search, AlertTriangle
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ChannelMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    jobTitle?: string;
    department?: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  isPrivate: boolean;
  createdById: string;
  createdBy?: { id: string; name: string };
  members: ChannelMember[];
}

interface ChannelSettingsModalProps {
  channelId: string;
  currentUserId: string;
  currentUserRole?: string;
  onClose: () => void;
}

export default function ChannelSettingsModal({ 
  channelId, 
  currentUserId, 
  currentUserRole = "member",
  onClose 
}: ChannelSettingsModalProps) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "edit" | "invite">("members");
  
  // Edit Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Invite States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchChannelDetails();
    fetchUsers();
  }, [channelId]);

  const fetchChannelDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}`);
      const data = await res.json();
      if (data.channel) {
        setChannel(data.channel);
        setName(data.channel.name);
        setDescription(data.channel.description || "");
        setIsPrivate(data.channel.isPrivate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setAllUsers(data.users);
    } catch (e) {}
  };

  const myMemberRecord = channel?.members.find(m => m.user.id === currentUserId);
  const myRole = (currentUserRole === "admin" || currentUserRole === "ADMIN") 
    ? "admin" 
    : (myMemberRecord?.role || "member");
  const isCreator = channel?.createdById === currentUserId;
  const canManage = isCreator || myRole === "admin";

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isPrivate })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Channel updated successfully!");
        setChannel(prev => prev ? { ...prev, name: data.channel.name, description: data.channel.description, isPrivate: data.channel.isPrivate } : null);
        setTimeout(() => setMsg(""), 3000);
      } else {
        setErr(data.error || "Failed to update channel");
      }
    } catch (e) {
      setErr("Failed to update channel settings");
    } finally {
      setSaving(false);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setChannel(prev => prev ? {
          ...prev,
          members: prev.members.map(m => m.user.id === userId ? { ...m, role: newRole } : m)
        } : null);
      } else {
        alert(await res.text());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const kickMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the channel?")) return;
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setChannel(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.user.id !== userId)
        } : null);
      } else {
        alert(await res.text());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveChannel = async () => {
    if (!confirm("Are you sure you want to leave this channel?")) return;
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${currentUserId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onClose();
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChannel = async () => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete #${channel?.name}? All messages and files will be removed!`)) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onClose();
        router.push("/dashboard");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete channel");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds })
      });
      if (res.ok) {
        setSelectedUserIds([]);
        setActiveTab("members");
        fetchChannelDetails();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInviting(false);
    }
  };

  const existingMemberIds = channel?.members.map(m => m.user.id) || [];
  const nonMembers = allUsers.filter(u => !existingMemberIds.includes(u.id) && u.name.toLowerCase().includes(userSearch.toLowerCase()));

  const initials = (n: string) => n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: 16
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        maxHeight: '85vh',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
        animation: 'modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 8, borderRadius: 10, color: '#10b981', display: 'flex' }}>
              <Settings size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                #{channel?.name || "channel"} Settings
              </h2>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {channel?.isPrivate ? "Private Channel" : "Public Channel"} · {channel?.members.length || 0} Members
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '8px 16px',
          background: 'rgba(2, 6, 23, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={() => setActiveTab("members")}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: activeTab === "members" ? '#10b981' : 'transparent',
              color: activeTab === "members" ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <UserIcon size={15} /> Members ({channel?.members.length || 0})
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab("edit")}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: activeTab === "edit" ? '#10b981' : 'transparent',
                color: activeTab === "edit" ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <Settings size={15} /> Edit Channel
            </button>
          )}

          <button
            onClick={() => setActiveTab("invite")}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: activeTab === "invite" ? '#10b981' : 'transparent',
              color: activeTab === "invite" ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={15} /> Add People
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              Loading channel details...
            </div>
          ) : (
            <>
              {/* TAB 1: MEMBERS */}
              {activeTab === "members" && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {channel?.members.map(member => (
                      <div 
                        key={member.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                            display: 'flex', alignItems: 'center', justify: 'center',
                            fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0
                          }}>
                            {member.user.avatar ? (
                              <Image src={member.user.avatar} alt="" width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              initials(member.user.name)
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {member.user.name}
                              {member.user.id === currentUserId && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>(You)</span>}
                              {member.role === "admin" && <Crown size={14} color="#facc15" title="Admin" />}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              {member.user.jobTitle || member.user.email}
                            </div>
                          </div>
                        </div>

                        {/* Admin / Mod Controls */}
                        {canManage && member.user.id !== currentUserId && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.user.id, e.target.value)}
                              style={{
                                background: '#1e293b',
                                color: '#f8fafc',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                                padding: '4px 8px',
                                fontSize: 12
                              }}
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => kickMember(member.user.id)}
                              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}
                              title="Kick Member"
                            >
                              <UserMinus size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Leave Channel Action */}
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      onClick={handleLeaveChannel}
                      style={{
                        width: '100%',
                        padding: 12,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <LogOut size={16} /> Leave Channel
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT CHANNEL */}
              {activeTab === "edit" && canManage && (
                <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {msg && <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: 12, borderRadius: 10, fontSize: 13 }}>{msg}</div>}
                  {err && <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: 12, borderRadius: 10, fontSize: 13 }}>{err}</div>}

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#cbd5e1' }}>Channel Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: 12,
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#cbd5e1' }}>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="What is this channel about?"
                      style={{
                        width: '100%',
                        padding: 12,
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        resize: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Private Channel</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Only invited members can view this channel</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: 12,
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 8
                    }}
                  >
                    <Save size={16} /> Save Channel Changes
                  </button>

                  {/* Danger Zone */}
                  {isCreator && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: '#ef4444', margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Danger Zone</h4>
                      <button
                        type="button"
                        onClick={handleDeleteChannel}
                        style={{
                          width: '100%',
                          padding: 12,
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <Trash2 size={16} /> Delete Channel
                      </button>
                    </div>
                  )}
                </form>
              )}

              {/* TAB 3: INVITE MEMBERS */}
              {activeTab === "invite" && (
                <div>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Search colleagues to add..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 13
                      }}
                    />
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                  </div>

                  <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {nonMembers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                        No colleagues available to add.
                      </div>
                    ) : (
                      nonMembers.map(u => {
                        const isSelected = selectedUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (isSelected) setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                              else setSelectedUserIds(prev => [...prev, u.id]);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.06)'}`,
                              borderRadius: 10,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                {u.avatar ? <Image src={u.avatar} alt="" width={32} height={32} style={{ borderRadius: '50%' }} /> : initials(u.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.jobTitle || u.email}</div>
                              </div>
                            </div>
                            {isSelected && <Check size={18} color="#10b981" />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={handleAddMembers}
                      disabled={inviting}
                      style={{
                        width: '100%',
                        padding: 12,
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 16
                      }}
                    >
                      <UserPlus size={16} /> Add {selectedUserIds.length} Selected Member(s)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
