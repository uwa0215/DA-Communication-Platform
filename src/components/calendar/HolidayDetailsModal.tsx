"use client";

import React from "react";
import { X, Flag, Calendar as CalendarIcon, Info, Sun, Briefcase } from "lucide-react";
import calendarStyles from "@/app/(app)/calendar/calendar.module.css";
import type { Holiday } from "@/lib/philippineHolidays";

interface HolidayDetailsModalProps {
  holiday: Holiday;
  onClose: () => void;
}

export default function HolidayDetailsModal({ holiday, onClose }: HolidayDetailsModalProps) {
  const hDate = new Date(holiday.date + "T00:00:00");
  const formattedDate = hDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isRegular = holiday.type === "regular";

  // Determine if the holiday is upcoming, today, or past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holidayTime = new Date(holiday.date + "T00:00:00");
  holidayTime.setHours(0, 0, 0, 0);

  let statusLabel = "";
  let statusClass = "";
  if (holidayTime.getTime() === today.getTime()) {
    statusLabel = "Today";
    statusClass = calendarStyles.holidayStatusToday;
  } else if (holidayTime.getTime() > today.getTime()) {
    const diffDays = Math.ceil((holidayTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    statusLabel = diffDays === 1 ? "Tomorrow" : `In ${diffDays} days`;
    statusClass = calendarStyles.holidayStatusUpcoming;
  } else {
    const diffDays = Math.ceil((today.getTime() - holidayTime.getTime()) / (1000 * 60 * 60 * 24));
    statusLabel = diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
    statusClass = calendarStyles.holidayStatusPast;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {/* Header with colored accent */}
        <div className={`${calendarStyles.holidayModalHeader} ${isRegular ? calendarStyles.holidayModalHeaderRegular : calendarStyles.holidayModalHeaderSpecial}`}>
          <div className={calendarStyles.holidayModalIcon}>
            <Flag size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className={calendarStyles.holidayModalTitle}>{holiday.name}</h2>
            <span className={`${calendarStyles.holidayModalTypeBadge} ${isRegular ? calendarStyles.holidayModalTypeBadgeRegular : calendarStyles.holidayModalTypeBadgeSpecial}`}>
              {isRegular ? "Regular Holiday" : "Special Non-Working Day"}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: "inherit", opacity: 0.7 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={calendarStyles.holidayModalBody}>
          {/* Date */}
          <div className={calendarStyles.holidayModalRow}>
            <CalendarIcon size={20} className={calendarStyles.holidayModalRowIcon} />
            <div>
              <div className={calendarStyles.holidayModalRowLabel}>Date</div>
              <div className={calendarStyles.holidayModalRowValue}>{formattedDate}</div>
            </div>
            <span className={`${calendarStyles.holidayStatusBadge} ${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          {/* Type */}
          <div className={calendarStyles.holidayModalRow}>
            {isRegular ? (
              <Briefcase size={20} className={calendarStyles.holidayModalRowIcon} />
            ) : (
              <Sun size={20} className={calendarStyles.holidayModalRowIcon} />
            )}
            <div>
              <div className={calendarStyles.holidayModalRowLabel}>Type</div>
              <div className={calendarStyles.holidayModalRowValue}>
                {isRegular ? "Regular Holiday" : "Special Non-Working Day"}
              </div>
            </div>
          </div>

          {/* About this holiday */}
          <div className={calendarStyles.holidayModalNote}>
            <Info size={16} className={calendarStyles.holidayModalNoteIcon} />
            <span>{holiday.description}</span>
          </div>
        </div>

        {/* Footer */}
        <div className={calendarStyles.modalFooter}>
          <div />
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
