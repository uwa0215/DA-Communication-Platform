"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, []);

  const nextMonth = () => {
    const nextD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextD);
    setSelectedDate(nextD);
  };

  const prevMonth = () => {
    const prevD = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prevD);
    setSelectedDate(prevD);
  };
  
  const today = () => {
    const nowD = new Date();
    setCurrentDate(nowD);
    setSelectedDate(nowD);
  };

  const handleDateClick = (d: { day: number, isCurrentMonth: boolean, date: Date }) => {
    setSelectedDate(d.date);
    if (!d.isCurrentMonth) {
      setCurrentDate(new Date(d.date.getFullYear(), d.date.getMonth(), 1));
    }
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

  const isSelectedDate = (d: Date) => {
    return selectedDate && 
      d.getDate() === selectedDate.getDate() && 
      d.getMonth() === selectedDate.getMonth() && 
      d.getFullYear() === selectedDate.getFullYear();
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => {
      const mDate = new Date(m.startTime);
      return mDate.getDate() === date.getDate() && 
             mDate.getMonth() === date.getMonth() && 
             mDate.getFullYear() === date.getFullYear();
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  // Selected Date events
  const selectedDayMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];
  const selectedDayHolidays = selectedDate ? (holidayMap.get(fmtDate(selectedDate)) || []) : [];

  // Upcoming meetings logic
  const now = new Date();
  const upcomingMeetings = [...meetings]
    .filter(m => new Date(m.endTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 10);

  // Upcoming holidays (next 5)
  const upcomingHolidays = useMemo(() => {
    const todayStr = fmtDate(now);
    const allHolidays = getPhilippineHolidays(now.getFullYear());
    const nextYearHolidays = getPhilippineHolidays(now.getFullYear() + 1);
    
    return [...allHolidays, ...nextYearHolidays]
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [year]);

  return (
    <div ref={containerRef} className={calendarStyles.calendarPage}>
      {/* ===== HEADER ===== */}
      <div className={calendarStyles.header}>
        <div className={calendarStyles.titleArea}>
          <h1 className={calendarStyles.title}>
            <CalendarIcon size={24} className="text-brand" /> Calendar
          </h1>
          <button className="btn btn-ghost btn-sm" onClick={today}>Today</button>
        </div>

        <div className={calendarStyles.monthNav}>
          <button className={calendarStyles.navBtn} onClick={prevMonth}><ChevronLeft size={20} /></button>
          <div className={calendarStyles.currentMonth}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button className={calendarStyles.navBtn} onClick={nextMonth}><ChevronRight size={20} /></button>
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
          <button className={`btn btn-primary ${calendarStyles.newMeetingHeaderBtn}`} onClick={() => setShowScheduleModal(true)}>
            <Plus size={18} /> New Meeting
          </button>
        </div>
      </div>

      <div className={calendarStyles.mainArea}>
        {/* ===== CALENDAR GRID ===== */}
        <div className={calendarStyles.calendarGrid}>
          <div className={calendarStyles.daysHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
              <div key={d} className={calendarStyles.dayName}>
                <span className="hidden-mobile">{d}</span>
                <span className="visible-mobile">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}</span>
              </div>
            ))}
          </div>
          
          <div className={calendarStyles.datesGrid}>
            {days.map((d, i) => {
              const dayMeetings = getMeetingsForDate(d.date);
              const dateStr = fmtDate(d.date);
              const dayHolidays = holidayMap.get(dateStr) || [];
              const hasHoliday = dayHolidays.length > 0;
              const isSelected = isSelectedDate(d.date);
              
              return (
                <div 
                  key={i} 
                  onClick={() => handleDateClick(d)}
                  className={`
                    ${calendarStyles.dateCell} 
                    ${!d.isCurrentMonth ? calendarStyles.dateCellOtherMonth : ''} 
                    ${hasHoliday ? calendarStyles.dateCellHoliday : ''}
                    ${isSelected ? calendarStyles.dateCellSelected : ''}
                  `}
                >
                  <div className={calendarStyles.dateNumberWrapper}>
                    <span className={`
                      ${calendarStyles.dateNumber} 
                      ${isToday(d.date) ? calendarStyles.dateNumberToday : ''} 
                      ${hasHoliday && !isToday(d.date) ? calendarStyles.dateNumberHoliday : ''}
                    `}>
                      {d.day}
                    </span>
                  </div>
                  
                  {/* Indicators for Mobile View */}
                  <div className={calendarStyles.dotsRow}>
                    {dayHolidays.map((h, hi) => (
                      <span 
                        key={`dot-h-${hi}`} 
                        className={`${calendarStyles.dot} ${h.type === 'regular' ? calendarStyles.dotRegularHoliday : calendarStyles.dotSpecialHoliday}`} 
                        title={h.name} 
                      />
                    ))}
                    {dayMeetings.slice(0, 3).map((m, mi) => (
                      <span key={`dot-m-${mi}`} className={`${calendarStyles.dot} ${calendarStyles.dotMeeting}`} title={m.title} />
                    ))}
                  </div>

                  {/* Text Blocks for Desktop View */}
                  <div className={calendarStyles.desktopBlocks}>
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
                    
                    {dayMeetings.slice(0, hasHoliday ? 2 : 3).map(m => (
                      <div key={m.id} className={calendarStyles.meetingBlock} onClick={(e) => { e.stopPropagation(); setSelectedMeeting(m); }}>
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

        {/* ===== AGENDA & SELECTED DAY PANEL ===== */}
        <div className={calendarStyles.agendaPanel}>
          <div className={calendarStyles.agendaHeader}>
            <div className={calendarStyles.agendaTitle}>
              {selectedDate ? (
                <span>
                  {isToday(selectedDate) ? "Today's Agenda" : selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                </span>
              ) : (
                "Upcoming Events"
              )}
            </div>
            {selectedDate && !isToday(selectedDate) && (
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={() => setSelectedDate(new Date())}
                style={{ fontSize: 11 }}
              >
                Go to Today
              </button>
            )}
          </div>

          <div className={calendarStyles.agendaList}>
            {/* Selected Day Holidays */}
            {selectedDayHolidays.length > 0 && (
              <>
                <div className={calendarStyles.agendaSectionLabel}>🇵🇭 Holiday</div>
                {selectedDayHolidays.map((h, i) => (
                  <div key={`sel-h-${i}`} className={calendarStyles.agendaHoliday} onClick={() => setSelectedHoliday(h)} style={{ cursor: 'pointer' }}>
                    <Flag size={18} className={calendarStyles.agendaHolidayIcon} />
                    <div className={calendarStyles.agendaHolidayText}>
                      <div className={calendarStyles.agendaHolidayName}>{h.name}</div>
                      <div className={calendarStyles.agendaHolidayDate}>{h.type === 'regular' ? 'Regular Holiday' : 'Special Non-Working Day'}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Selected Day Meetings */}
            <div className={calendarStyles.agendaSectionLabel}>📅 Scheduled Meetings</div>
            {selectedDayMeetings.length === 0 ? (
              <div className={calendarStyles.emptyAgenda}>
                No meetings scheduled for this date.
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowScheduleModal(true)}>
                    <Plus size={14} /> Schedule Meeting
                  </button>
                </div>
              </div>
            ) : (
              selectedDayMeetings.map(m => {
                const start = new Date(m.startTime);
                const end = new Date(m.endTime);
                const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                
                return (
                  <div key={m.id} className={calendarStyles.agendaItem} onClick={() => setSelectedMeeting(m)}>
                    <div className={calendarStyles.agendaTime}>{timeStr}</div>
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

            {/* Upcoming Section when not selected or in addition */}
            {upcomingHolidays.length > 0 && (
              <>
                <div className={calendarStyles.agendaSectionLabel} style={{ marginTop: 16 }}>Upcoming Holidays</div>
                {upcomingHolidays.slice(0, 3).map((h, i) => {
                  const hDate = new Date(h.date + 'T00:00:00');
                  const dateLabel = isToday(hDate) ? 'Today' : hDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <div key={`up-h-${i}`} className={calendarStyles.agendaHoliday} onClick={() => setSelectedHoliday(h)} style={{ cursor: 'pointer' }}>
                      <Flag size={16} className={calendarStyles.agendaHolidayIcon} />
                      <div className={calendarStyles.agendaHolidayText}>
                        <div className={calendarStyles.agendaHolidayName}>{h.name}</div>
                        <div className={calendarStyles.agendaHolidayDate}>{dateLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button 
        className={calendarStyles.fabBtn} 
        onClick={() => setShowScheduleModal(true)} 
        title="Schedule New Meeting"
      >
        <Plus size={24} />
      </button>

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
