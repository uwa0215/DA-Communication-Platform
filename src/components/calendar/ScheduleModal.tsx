"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Users } from "lucide-react";
import calendarStyles from "@/app/(app)/calendar/calendar.module.css";

interface ScheduleModalProps {
  onClose: () => void;
  onSuccess: (meeting: any) => void;
  currentUserId: string;
}

export default function ScheduleModal({ onClose, onSuccess, currentUserId }: ScheduleModalProps) {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [users, setUsers] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch users for invitation
  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data.filter((u: any) => u.id !== currentUserId));
        } else if (data.users) {
          setUsers(data.users.filter((u: any) => u.id !== currentUserId));
        }
      })
      .catch(err => console.error("Failed to load users:", err));
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime || !endDate || !endTime) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      if (startDateTime >= endDateTime) {
        setError("End time must be after start time.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          participantIds: selectedParticipants
        })
      });

      if (!res.ok) {
        throw new Error("Failed to schedule meeting");
      }

      const meeting = await res.json();
      onSuccess(meeting);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2 className="modal-title">Schedule Meeting</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={calendarStyles.modalBody}>
            {error && <div className="form-error" style={{ padding: "10px", background: "#fee2e2", borderRadius: "8px" }}>{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Meeting Title *</label>
              <input 
                type="text" 
                className="input" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Weekly Sync"
                required
              />
            </div>

            <div className={calendarStyles.formGrid}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input type="time" className="input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input type="time" className="input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea 
                className="input" 
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Agenda, notes, links..."
                style={{ resize: "none" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} /> Invite Attendees
              </label>
              <div className={calendarStyles.participantList}>
                {users.length === 0 && <span className="text-muted" style={{ fontSize: 13, padding: 8 }}>Loading users...</span>}
                {users.map(u => (
                  <label key={u.id} className={calendarStyles.participantItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="avatar avatar-sm">
                        {u.avatar ? <Image src={u.avatar} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : u.name[0]}
                      </div>
                      <span style={{ fontSize: 14 }}>{u.name}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={selectedParticipants.includes(u.id)}
                      onChange={() => toggleParticipant(u.id)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={calendarStyles.modalFooter}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
