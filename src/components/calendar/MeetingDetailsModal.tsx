"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Clock, Users, AlignLeft, CheckCircle2, XCircle, HelpCircle, Trash2, Video, Copy, ExternalLink } from "lucide-react";
import calendarStyles from "@/app/(app)/calendar/calendar.module.css";

interface MeetingDetailsModalProps {
  meeting: any;
  onClose: () => void;
  onUpdate: (updatedMeeting: any, deleted?: boolean) => void;
  currentUserId: string;
}

export default function MeetingDetailsModal({ meeting, onClose, onUpdate, currentUserId }: MeetingDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const startDate = new Date(meeting.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = `${new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(meeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const myParticipantRecord = meeting.participants?.find((p: any) => p.userId === currentUserId);
  const isCreator = meeting.createdById === currentUserId;

  const handleRsvp = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to RSVP");
      
      const updatedParticipant = await res.json();
      
      // Update local state
      const updatedMeeting = {
        ...meeting,
        participants: meeting.participants.map((p: any) => 
          p.id === updatedParticipant.id ? updatedParticipant : p
        )
      };
      
      onUpdate(updatedMeeting);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this meeting? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      
      onUpdate(meeting, true);
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle2 size={16} className={calendarStyles.statusAccepted} />;
      case 'declined': return <XCircle size={16} className={calendarStyles.statusDeclined} />;
      default: return <HelpCircle size={16} className={calendarStyles.statusPending} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--brand)' }} />
            {meeting.title}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={calendarStyles.modalBody}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CalendarIcon size={20} className="text-muted" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{startDate}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{timeStr}</div>
              </div>
            </div>

            {meeting.meetLink && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 10,
                background: 'rgba(52, 211, 153, 0.06)', 
                border: '1px solid rgba(52, 211, 153, 0.15)', 
                borderRadius: 'var(--r-md)', 
                padding: '14px 16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Video size={20} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Video Call</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meeting.meetLink}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a 
                    href={meeting.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
                  >
                    <Video size={16} /> Join Meeting
                  </a>
                  <button 
                    className="btn btn-ghost" 
                    style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => {
                      navigator.clipboard.writeText(meeting.meetLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy size={14} /> {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}

            {meeting.description && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlignLeft size={20} className="text-muted" style={{ marginTop: 2 }} />
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {meeting.description}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Users size={20} className="text-muted" style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Attendees ({meeting.participants?.length || 0})
                </div>
                <div className={calendarStyles.participantList} style={{ maxHeight: 150 }}>
                  {meeting.participants?.map((p: any) => (
                    <div key={p.id} className={calendarStyles.participantItem}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="avatar avatar-sm">
                          {p.user.avatar ? <img src={p.user.avatar} alt="" /> : p.user.name[0]}
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                          {p.user.name} {p.userId === meeting.createdById ? '(Organizer)' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {p.status} {getStatusIcon(p.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={calendarStyles.modalFooter} style={{ justifyContent: 'space-between' }}>
          <div>
            {isCreator && (
              <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={handleCancel} disabled={loading}>
                <Trash2 size={16} /> Cancel Meeting
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {myParticipantRecord && !isCreator && (
              <>
                <button 
                  className={`btn ${myParticipantRecord.status === 'declined' ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => handleRsvp('declined')}
                  disabled={loading}
                >
                  Decline
                </button>
                <button 
                  className={`btn ${myParticipantRecord.status === 'tentative' ? 'btn-primary' : 'btn-ghost'}`}
                  style={myParticipantRecord.status === 'tentative' ? {} : { color: 'var(--status-away)' }}
                  onClick={() => handleRsvp('tentative')}
                  disabled={loading}
                >
                  Tentative
                </button>
                <button 
                  className={`btn ${myParticipantRecord.status === 'accepted' ? 'btn-primary' : 'btn-ghost'}`}
                  style={myParticipantRecord.status === 'accepted' ? {} : { color: 'var(--status-online)' }}
                  onClick={() => handleRsvp('accepted')}
                  disabled={loading}
                >
                  Accept
                </button>
              </>
            )}
            {(isCreator || !myParticipantRecord) && (
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
