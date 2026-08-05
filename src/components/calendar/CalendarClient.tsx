"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Flag } from "lucide-react";
import calendarStyles from "@/app/(app)/calendar/calendar.module.css";
import ScheduleModal from "@/components/calendar/ScheduleModal";
import MeetingDetailsModal from "@/components/calendar/MeetingDetailsModal";
import HolidayDetailsModal from "@/components/calendar/HolidayDetailsModal";
import { getPhilippineHolidays, type Holiday } from "@/lib/philippineHolidays";

interface CalendarClientProps {
  initialMeetings: any[];
  currentUserId: string;
}

export default function CalendarClient({ initialMeetings, currentUserId }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const today = () => {
    setCurrentDate(new Date());
  };

  const handleMeetingScheduled = (newMeeting: any) => {
    setMeetings([...meetings, newMeeting]);
  };

  const handleMeetingUpdated = (updatedMeeting: any, isDeleted?: boolean) => {
    if (isDeleted) {
      setMeetings(meetings.filter(m => m.id !== updatedMeeting.id));
    } else {
      setMeetings(meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
    }
    if (selectedMeeting?.id === updatedMeeting.id) {
      setSelectedMeeting(isDeleted ? null : updatedMeeting);
    }
  };

  // --- Calendar Grid Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days: { day: number, isCurrentMonth: boolean, date: Date }[] = [];
  
  // Previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    const day = daysInPrevMonth - firstDayOfMonth + i + 1;
    days.push({ day, isCurrentMonth: false, date: new Date(year, month - 1, day) });
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  
  // Next month padding
  const totalSlots = Math.ceil(days.length / 7) * 7;
  const paddingEnd = totalSlots - days.length;
  for (let i = 1; i <= paddingEnd; i++) {
    days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  // Philippine holidays for the visible year range
  const holidayMap = useMemo(() => {
    const yearsToLoad = new Set<number>();
    days.forEach(d => yearsToLoad.add(d.date.getFullYear()));
    
    const map = new Map<string, Holiday[]>();
    yearsToLoad.forEach(y => {
      getPhilippineHolidays(y).forEach(h => {
        const existing = map.get(h.date) || [];
        existing.push(h);
        map.set(h.date, existing);
      });
    });
    return map;
  }, [year, month]);

  const fmtDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => {
      const mDate = new Date(m.startTime);
      return mDate.getDate() === date.getDate() && 
             mDate.getMonth() === date.getMonth() && 
             mDate.getFullYear() === date.getFullYear();
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  // Agenda logic — upcoming meetings + upcoming holidays
  const now = new Date();
  const upcomingMeetings = [...meetings]
    .filter(m => new Date(m.endTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 10);

  // Upcoming holidays (next 5)
  const upcomingHolidays = useMemo(() => {
    const todayStr = fmtDate(now);
    const allHolidays = getPhilippineHolidays(now.getFullYear());
    // Add next year's holidays too for when we're near year-end
    const nextYearHolidays = getPhilippineHolidays(now.getFullYear() + 1);
    
    return [...allHolidays, ...nextYearHolidays]
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [year]);

  return (
    <div className={calendarStyles.calendarPage}>
      <div className={calendarStyles.header}>
        <div className={calendarStyles.titleArea}>
          <h1 className={calendarStyles.title}>
            <CalendarIcon size={24} className="text-brand" /> Calendar
          </h1>
          <div className={calendarStyles.monthNav}>
            <button className={calendarStyles.navBtn} onClick={prevMonth}><ChevronLeft size={20} /></button>
            <div className={calendarStyles.currentMonth}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button className={calendarStyles.navBtn} onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>
          <button className="btn btn-ghost" onClick={today} style={{ marginLeft: 8 }}>Today</button>
        </div>
        
        <div className={calendarStyles.headerActions}>
          <div className={calendarStyles.holidayLegend}>
            <span className={calendarStyles.legendLabel}>
              <span className={`${calendarStyles.legendDot} ${calendarStyles.legendRegular}`} />
              Regular Holiday
            </span>
            <span className={calendarStyles.legendLabel}>
              <span className={`${calendarStyles.legendDot} ${calendarStyles.legendSpecial}`} />
              Special Non-Working
            </span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
            <Plus size={18} /> New Meeting
          </button>
        </div>
      </div>

      <div className={calendarStyles.mainArea}>
        {/* Left Agenda Panel */}
        <div className={calendarStyles.agendaPanel}>
          <div className={calendarStyles.agendaHeader}>
            <div className={calendarStyles.agendaTitle}>Upcoming</div>
          </div>
          <div className={calendarStyles.agendaList}>
            {/* Upcoming Holidays */}
            {upcomingHolidays.length > 0 && (
              <>
                <div className={calendarStyles.agendaSectionLabel}>🇵🇭 Holidays</div>
                {upcomingHolidays.map((h, i) => {
                  const hDate = new Date(h.date + 'T00:00:00');
                  const dateLabel = isToday(hDate) ? 'Today' : hDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
                  return (
                    <div key={`holiday-${i}`} className={calendarStyles.agendaHoliday} onClick={() => setSelectedHoliday(h)} style={{ cursor: 'pointer' }}>
                      <Flag size={18} className={calendarStyles.agendaHolidayIcon} />
                      <div className={calendarStyles.agendaHolidayText}>
                        <div className={calendarStyles.agendaHolidayName}>{h.name}</div>
                        <div className={calendarStyles.agendaHolidayDate}>{dateLabel}</div>
                      </div>
                      <span className={`${calendarStyles.agendaHolidayType} ${h.type === 'regular' ? calendarStyles.agendaHolidayTypeRegular : calendarStyles.agendaHolidayTypeSpecial}`}>
                        {h.type === 'regular' ? 'Regular' : 'Special'}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* Upcoming Meetings */}
            <div className={calendarStyles.agendaSectionLabel}>📅 Meetings</div>
            {upcomingMeetings.length === 0 ? (
              <div className={calendarStyles.emptyAgenda}>
                No upcoming meetings. Enjoy your free time!
              </div>
            ) : (
              upcomingMeetings.map(m => {
                const start = new Date(m.startTime);
                const isTodayStr = isToday(start) ? 'Today' : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={m.id} className={calendarStyles.agendaItem} onClick={() => setSelectedMeeting(m)}>
                    <div className={calendarStyles.agendaTime}>{isTodayStr}, {timeStr}</div>
                    <div className={calendarStyles.agendaMeetingTitle}>{m.title}</div>
                    <div className={calendarStyles.agendaParticipants}>
                      {m.participants?.slice(0, 4).map((p: any) => (
                        <div key={p.id} className={calendarStyles.agendaAvatar} title={p.user.name}>
                          {p.user.avatar ? <Image src={p.user.avatar} alt="" width={32} height={32} style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}} /> : p.user.name[0]}
                        </div>
                      ))}
                      {m.participants?.length > 4 && (
                        <div className={calendarStyles.agendaAvatar} style={{ background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                          +{m.participants.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Calendar Grid */}
        <div className={calendarStyles.calendarGrid}>
          <div className={calendarStyles.daysHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className={calendarStyles.dayName}>{d}</div>
            ))}
          </div>
          
          <div className={calendarStyles.datesGrid}>
            {days.map((d, i) => {
              const dayMeetings = getMeetingsForDate(d.date);
              const dateStr = fmtDate(d.date);
              const dayHolidays = holidayMap.get(dateStr) || [];
              const hasHoliday = dayHolidays.length > 0;
              
              return (
                <div 
                  key={i} 
                  className={`${calendarStyles.dateCell} ${!d.isCurrentMonth ? calendarStyles.dateCellOtherMonth : ''} ${hasHoliday ? calendarStyles.dateCellHoliday : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span className={`${calendarStyles.dateNumber} ${isToday(d.date) ? calendarStyles.dateNumberToday : ''} ${hasHoliday && !isToday(d.date) ? calendarStyles.dateNumberHoliday : ''}`}>
                      {d.day}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto' }}>
                    {/* Holiday tags first */}
                    {dayHolidays.map((h, hi) => (
                      <span 
                        key={`h-${hi}`} 
                        className={`${calendarStyles.holidayTag} ${h.type === 'regular' ? calendarStyles.holidayTagRegular : calendarStyles.holidayTagSpecial}`}
                        title={`${h.name} (${h.type === 'regular' ? 'Regular Holiday' : 'Special Non-Working Day'})`}
                        onClick={(e) => { e.stopPropagation(); setSelectedHoliday(h); }}
                        style={{ cursor: 'pointer' }}
                      >
                        {h.name}
                      </span>
                    ))}
                    
                    {/* Meeting blocks */}
                    {dayMeetings.slice(0, hasHoliday ? 2 : 3).map(m => (
                      <div key={m.id} className={calendarStyles.meetingBlock} onClick={() => setSelectedMeeting(m)}>
                        <span className={calendarStyles.meetingBlockTime}>
                          {new Date(m.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '')}
                        </span>
                        {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > (hasHoliday ? 2 : 3) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', cursor: 'pointer' }}>
                        +{dayMeetings.length - (hasHoliday ? 2 : 3)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleModal 
          onClose={() => setShowScheduleModal(false)} 
          onSuccess={handleMeetingScheduled}
          currentUserId={currentUserId}
        />
      )}

      {selectedMeeting && (
        <MeetingDetailsModal 
          meeting={selectedMeeting} 
          onClose={() => setSelectedMeeting(null)}
          onUpdate={handleMeetingUpdated}
          currentUserId={currentUserId}
        />
      )}

      {selectedHoliday && (
        <HolidayDetailsModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
        />
      )}
    </div>
  );
}
