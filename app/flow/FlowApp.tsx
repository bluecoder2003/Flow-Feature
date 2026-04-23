'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ProfileCircle, SearchNormal1, Calendar1,
  Microphone2, Chart, TickCircle, Clock, Edit2, Trash,
  Magicpen, Health, Sun1, Routing2, Briefcase, People,
  Coffee, Activity, Drop, AddSquare,
  CloudChange, Flash, Medal, LocationDiscover,
  type Icon,
} from 'iconsax-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  time: string;
  icon: string;           // emoji fallback (voice / user-added tasks)
  iconName?: string;      // Iconsax icon key for predefined tasks
  iconBg: string;
  iconColor: string;
  sub: string;
  done: boolean;
  snoozed: boolean;
  category?: 'commute' | 'meeting' | 'personal' | 'health';
}

// ─── Iconsax icon map ─────────────────────────────────────────────────────────

const TASK_ICON_MAP: Record<string, Icon> = {
  health: Health,
  sun: Sun1,
  drop: Drop,
  routing: Routing2,
  briefcase: Briefcase,
  people: People,
  coffee: Coffee,
  activity: Activity,
  mic: Microphone2,
  calendar: Calendar1,
};

const NUDGE_ICON_MAP: Record<string, Icon> = {
  routing: Routing2,
  health: Health,
  cloud: CloudChange,
  flash: Flash,
  medal: Medal,
  location: LocationDiscover,
};

// ─── Static data ──────────────────────────────────────────────────────────────

const WEEK_DAYS = [
  { abbr: 'MON', num: 21 },
  { abbr: 'TUE', num: 22 },
  { abbr: 'WED', num: 23 },
  { abbr: 'THU', num: 24 },
  { abbr: 'FRI', num: 25 },
  { abbr: 'SAT', num: 26 },
  { abbr: 'SUN', num: 27 },
];

const INITIAL_REMINDERS: Task[] = [
  { id: 'r1', title: 'Take medication', time: '8:00 AM', icon: '💊', iconName: 'health', iconBg: '#fff2f0', iconColor: '#e05252', sub: 'Morning dose · Urgent', done: false, snoozed: false },
  { id: 'r2', title: 'Morning stretch', time: '7:15 AM', icon: '🌅', iconName: 'sun', iconBg: '#fffbeb', iconColor: '#d97706', sub: '10 minutes', done: false, snoozed: false },
  { id: 'r3', title: 'Drink water', time: '7:30 AM', icon: '💧', iconName: 'drop', iconBg: '#edf4ff', iconColor: '#4b96e8', sub: '2 glasses before commute', done: false, snoozed: false },
  { id: 'r4', title: 'Call Mom', time: '6:00 PM', icon: '📞', iconName: 'people', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Weekly check-in', done: false, snoozed: false },
];

const INITIAL_EVENTS: Task[] = [
  { id: 'e1', title: 'Commute to office', time: '7:40 AM', icon: '🚇', iconName: 'routing', iconBg: '#edf4ff', iconColor: '#4b96e8', sub: 'Leave by 7:40 AM · 32 min', done: false, snoozed: false, category: 'commute' },
  { id: 'e2', title: 'Team standup', time: '9:00 AM', icon: '💼', iconName: 'briefcase', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Google Meet · 15 min', done: false, snoozed: false, category: 'meeting' },
  { id: 'e3', title: 'Lunch break', time: '1:00 PM', icon: '🥗', iconName: 'coffee', iconBg: '#edfaf3', iconColor: '#3daa6e', sub: '1:00 PM · 45 min', done: false, snoozed: false, category: 'personal' },
  { id: 'e4', title: 'Product review', time: '3:00 PM', icon: '🎙', iconName: 'people', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Conference room B · 1h', done: false, snoozed: false, category: 'meeting' },
  { id: 'e5', title: 'Evening run', time: '5:30 PM', icon: '🏃', iconName: 'activity', iconBg: '#edfaf3', iconColor: '#3daa6e', sub: '5:30 PM · 30 min', done: false, snoozed: false, category: 'personal' },
];

const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  commute: { bg: '#edf4ff', color: '#4b96e8', label: 'Commute' },
  meeting: { bg: '#f4f0ff', color: '#8b72e0', label: 'Meeting' },
  personal: { bg: '#edfaf3', color: '#3daa6e', label: 'Personal' },
  health:   { bg: '#fff2f0', color: '#e05252', label: 'Health' },
};

const VOICE_PHRASES = [
  'Add meeting at 5 PM',
  'Remind me to take medicine at 8 AM',
  'Meeting with design team tomorrow',
];

const AI_NUDGES = [
  { iconName: 'routing', text: 'Traffic 18% heavier. Leave at 7:35 to stay on time.', tag: 'Commute' },
  { iconName: 'health', text: "Medication missed twice. I've rescheduled it for tomorrow.", tag: 'Health' },
  { iconName: 'cloud', text: 'Light rain at 7:40 AM. Pack an umbrella today.', tag: 'Weather' },
  { iconName: 'flash', text: 'Peak focus window: 9–11 AM. Distractions cleared.', tag: 'Routine' },
  { iconName: 'medal', text: "3-day morning stretch streak. Keep it going!", tag: 'Habit' },
  { iconName: 'location', text: 'Metro Line 2 delayed. Bus route saves 8 min.', tag: 'Commute' },
];

const WEEKLY_STATS = { tasksCompleted: 23, tasksTotal: 28, remindersHandled: 14, remindersSnoozed: 4, onTimeCommutes: 4, totalCommutes: 5, avgLeaveTime: '7:42 AM', longestStreak: 'Morning stretch · 5 days', moodScore: 82 };
const MONTHLY_STATS = { tasksCompleted: 89, tasksTotal: 112, remindersHandled: 61, remindersSnoozed: 18, onTimeCommutes: 17, totalCommutes: 22, avgLeaveTime: '7:44 AM', longestStreak: 'Morning stretch · 12 days', moodScore: 78 };

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlowApp() {
  const [activeTab, setActiveTab]         = useState<'reminders' | 'events'>('reminders');
  const [reminders, setReminders]         = useState<Task[]>(INITIAL_REMINDERS);
  const [events, setEvents]               = useState<Task[]>(INITIAL_EVENTS);
  const [showNotif, setShowNotif]         = useState(false);
  const [showVoice, setShowVoice]         = useState(false);
  const [showAdd, setShowAdd]             = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [reportPeriod, setReportPeriod]   = useState<'weekly' | 'monthly'>('weekly');
  const [editTarget, setEditTarget]       = useState<Task | null>(null);
  const [toast, setToast]                 = useState('');
  const [toastVisible, setToastVisible]   = useState(false);
  const [taskType, setTaskType]           = useState<'reminder' | 'event'>('reminder');
  const [taskInput, setTaskInput]         = useState('');
  const [taskTime, setTaskTime]           = useState('');
  const [editInput, setEditInput]         = useState('');
  const [editTimeVal, setEditTimeVal]     = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [selectedDay, setSelectedDay]     = useState(22);
  const [deletingIds, setDeletingIds]     = useState<Set<string>>(new Set());
  const [nudgeIdx, setNudgeIdx]           = useState(0);
  const [nudgeFading, setNudgeFading]     = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [isMobile, setIsMobile]           = useState(false);

  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgeTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  // Mobile detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Rotate AI nudges
  useEffect(() => {
    nudgeTimer.current = setInterval(() => {
      setNudgeFading(true);
      setTimeout(() => { setNudgeIdx(i => (i + 1) % AI_NUDGES.length); setNudgeFading(false); }, 300);
    }, 4000);
    return () => { if (nudgeTimer.current) clearInterval(nudgeTimer.current); };
  }, []);

  const markDone = (id: string) => {
    const isDone = [...reminders, ...events].find(t => t.id === id)?.done;
    const update = (ts: Task[]) => ts.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setReminders(update); setEvents(update);
    showToast(isDone ? 'Marked undone' : '✓ Marked done');
  };

  const snoozeTask = (id: string) => {
    const update = (ts: Task[]) => ts.map(t => t.id === id ? { ...t, snoozed: true } : t);
    setReminders(update); setEvents(update);
    showToast('⏱ Snoozed 15 minutes');
  };

  const deleteTask = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setReminders(t => t.filter(r => r.id !== id));
      setEvents(t => t.filter(e => e.id !== id));
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 300);
    showToast('Deleted');
  };

  const openEdit = (task: Task) => {
    setEditTarget(task); setEditInput(task.title); setEditTimeVal(task.time);
    setShowEdit(true);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    const update = (ts: Task[]) => ts.map(t => t.id === editTarget.id ? { ...t, title: editInput || t.title, time: editTimeVal || t.time } : t);
    setReminders(update); setEvents(update);
    setShowEdit(false); setEditTarget(null); showToast('✎ Changes saved');
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    const bgs = ['#fffbeb', '#edf4ff', '#edfaf3', '#f4f0ff', '#fff2f0'];
    const newTask: Task = {
      id: uid(), title: taskInput.trim(),
      time: taskTime.trim() || 'Anytime', icon: taskType === 'reminder' ? '🔔' : '📅',
      iconBg: bgs[Math.floor(Math.random() * bgs.length)], iconColor: '#888',
      sub: 'Just added', done: false, snoozed: false,
    };
    if (taskType === 'reminder') { setReminders(r => [...r, newTask]); setActiveTab('reminders'); }
    else { setEvents(e => [...e, newTask]); setActiveTab('events'); }
    setTaskInput(''); setTaskTime(''); setShowAdd(false); showToast('✓ Added to Flow');
  };

  const openVoice = () => {
    setShowVoice(true); setVoiceTranscript('');
    const phrase = VOICE_PHRASES[Math.floor(Math.random() * VOICE_PHRASES.length)];
    let i = 0;
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setTimeout(() => {
      voiceTimer.current = setInterval(() => {
        if (i < phrase.length) { setVoiceTranscript(phrase.slice(0, ++i)); }
        else {
          if (voiceTimer.current) clearInterval(voiceTimer.current);
          setTimeout(() => {
            setShowVoice(false); setVoiceTranscript('');
            const name = phrase.replace(/^(add|remind me to)\s+/i, '').replace(/\s+at\s+.*/i, '');
            const timeMatch = phrase.match(/(\d+\s*(am|pm))/i);
            const newTask: Task = {
              id: uid(), title: name.charAt(0).toUpperCase() + name.slice(1),
              time: timeMatch ? timeMatch[0] : 'Today', icon: '🎙', iconName: 'mic',
              iconBg: '#edf4ff', iconColor: '#4b96e8', sub: 'Added via voice',
              done: false, snoozed: false,
            };
            setReminders(r => [...r, newTask]); setActiveTab('reminders');
            showToast('🎙 Added via voice');
          }, 800);
        }
      }, 60);
    }, 600);
  };

  const closeVoice = () => {
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setShowVoice(false); setVoiceTranscript('');
  };

  const handleDownload = () => {
    setDownloadState('loading');
    const stats = reportPeriod === 'weekly' ? WEEKLY_STATS : MONTHLY_STATS;
    const data = { period: reportPeriod, generatedAt: new Date().toISOString(), summary: stats, reminders, events };
    setTimeout(() => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `flow-${reportPeriod}-report.json`; a.click();
      URL.revokeObjectURL(url);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
      showToast('✓ Report downloaded');
    }, 1200);
  };

  useEffect(() => { if (showAdd) setTimeout(() => addInputRef.current?.focus(), 350); }, [showAdd]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowNotif(false); closeVoice(); setShowAdd(false); setShowEdit(false); setShowReport(false); }
      if (e.key === 'Enter' && showAdd) addTask();
      if (e.key === 'Enter' && showEdit) saveEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const stats = reportPeriod === 'weekly' ? WEEKLY_STATS : MONTHLY_STATS;
  const nudge = AI_NUDGES[nudgeIdx];
  const NudgeIconComp: Icon | null = NUDGE_ICON_MAP[nudge.iconName] ?? null;
  const completionPct = Math.round((stats.tasksCompleted / stats.tasksTotal) * 100);
  const commutePct = Math.round((stats.onTimeCommutes / stats.totalCommutes) * 100);

  // ── Shared app content (same on mobile and desktop) ──────────────────────────
  const appContent = (
    <>
      {/* Scrollable */}
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: isMobile ? 'max(16px, env(safe-area-inset-top))' : 60, paddingBottom: 100, background: '#fafafa' }}>

        {/* Top nav */}
        <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={iconBtnStyle}><ProfileCircle size={18} color="#888" variant="Linear" /></button>
          <button style={iconBtnStyle}><SearchNormal1 size={16} color="#888" variant="Linear" /></button>
        </div>

        {/* Greeting */}
        <div style={{ padding: '10px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: '#0a0a0a', letterSpacing: -1, lineHeight: 1.1 }}>Good morning</span>
            <span style={{ fontSize: 30, fontWeight: 700, color: '#3EAF78', lineHeight: 1.1 }}>•</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
            <Calendar1 size={12} color="#c0c0c0" variant="Linear" />
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>Tuesday, April 22</span>
            <span style={{ color: '#e0e0e0' }}>·</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>🌧 18°</span>
          </div>
        </div>

        {/* AI card */}
        <div style={{ margin: '14px 24px 0', background: '#f0ecff', borderRadius: 18, padding: '14px 14px 12px', border: '1px solid #e4deff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(155,137,212,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -15, right: 30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(155,137,212,0.08)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Magicpen size={12} color="#8b72e0" variant="Linear" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8b72e0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Flow</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2060', lineHeight: 1.35, marginBottom: 10 }}>You&apos;re on track. Leave at 7:40 AM</div>
              <div style={{ borderTop: '1px dashed rgba(155,137,212,0.35)', paddingTop: 8, height: 40, overflow: 'hidden', position: 'relative' }}>
                <div style={{ opacity: nudgeFading ? 0 : 1, transition: 'opacity 0.3s ease', display: 'flex', alignItems: 'flex-start', gap: 6, position: 'absolute', top: 8, left: 0, right: 0 }}>
                  <div style={{ flexShrink: 0, lineHeight: 1, marginTop: 1 }}>
                    {NudgeIconComp ? <NudgeIconComp size={13} color="#7c6ee0" variant="Bulk" /> : null}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: '#5a4a8a', lineHeight: 1.4 }}>{nudge.text}</span>
                  </div>
                </div>
              </div>
            </div>
            <FlowIllustration />
          </div>
        </div>

        {/* Calendar strip */}
        <div style={{ margin: '16px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {WEEK_DAYS.map(d => {
            const active = selectedDay === d.num;
            return (
              <button key={d.num} onClick={() => setSelectedDay(d.num)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 44, padding: '8px 2px 6px', border: 'none', cursor: 'pointer', borderRadius: 16, background: active ? '#fff' : 'transparent', transition: 'all 0.18s ease' }}>
                <span style={{ fontSize: 18, fontWeight: active ? 700 : 400, lineHeight: 1.15, color: active ? '#0a0a0a' : '#b8b8b8', letterSpacing: '-0.4px' }}>{d.num}</span>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? '#3EAF78' : '#c8c8c8' }}>{d.abbr}</span>
              </button>
            );
          })}
        </div>

        <div style={{ margin: '14px 24px 0', borderTop: '1px dashed #e8e8e8' }} />

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '10px 24px 0' }}>
          {(['reminders', 'events'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? '#0a0a0a' : '#c0c0c0', padding: '7px 0', cursor: 'pointer', position: 'relative', textTransform: 'capitalize' }}>
              {tab}
              {activeTab === tab && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: '#0a0a0a', borderRadius: 2 }} />}
            </button>
          ))}
        </div>

        {/* Reminders */}
        {activeTab === 'reminders' && (
          <div>
            <SectionLabel>Today</SectionLabel>
            <div style={{ padding: '0 24px', marginTop: 2 }}>
              {reminders.length === 0 && <EmptyState text="No reminders — tap + to add one" />}
              {reminders.map(task => (
                <TaskRow key={task.id} task={task} deleting={deletingIds.has(task.id)}
                  onDone={() => markDone(task.id)} onSnooze={() => snoozeTask(task.id)}
                  onDelete={() => deleteTask(task.id)} onEdit={() => openEdit(task)} showCategory={false} />
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {activeTab === 'events' && (
          <div>
            <SectionLabel>Morning</SectionLabel>
            <div style={{ padding: '0 24px', marginTop: 2 }}>
              {events.filter(e => e.time.includes('AM')).map(task => (
                <TaskRow key={task.id} task={task} deleting={deletingIds.has(task.id)}
                  onDone={() => markDone(task.id)} onSnooze={() => snoozeTask(task.id)}
                  onDelete={() => deleteTask(task.id)} onEdit={() => openEdit(task)} showCategory />
              ))}
            </div>
            <SectionLabel>Afternoon</SectionLabel>
            <div style={{ padding: '0 24px', marginTop: 2 }}>
              {events.filter(e => e.time.includes('PM')).map(task => (
                <TaskRow key={task.id} task={task} deleting={deletingIds.has(task.id)}
                  onDone={() => markDone(task.id)} onSnooze={() => snoozeTask(task.id)}
                  onDelete={() => deleteTask(task.id)} onEdit={() => openEdit(task)} showCategory />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(250,250,250,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 36, paddingRight: 36, paddingTop: 16, paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24, zIndex: 50 }}>
        <button onClick={() => setShowReport(true)} style={{ ...navBtnStyle, background: '#f0f0f0' }}>
          <Chart size={18} color="#888" variant="Linear" />
        </button>
        <button onClick={() => setShowAdd(true)} style={{ width: 54, height: 54, borderRadius: 18, background: '#0a0a0a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
          <AddSquare size={22} color="#fff" variant="Linear" />
        </button>
        <button onClick={openVoice} style={{ ...navBtnStyle, background: '#f0f0f0' }}>
          <Microphone2 size={18} color="#888" variant="Linear" />
        </button>
      </div>

      {/* Notification overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'linear-gradient(160deg,#1c2331 0%,#0f1623 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, opacity: showNotif ? 1 : 0, pointerEvents: showNotif ? 'all' : 'none', transition: 'opacity 0.35s ease' }}>
        <div style={{ fontSize: 72, fontWeight: 300, color: '#fff', lineHeight: 1, letterSpacing: -3, marginTop: 20 }}>7:28</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Tuesday, April 22</div>
        <div style={{ width: 'calc(100% - 32px)', marginTop: 32, background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, padding: '14px 16px', transform: showNotif ? 'translateY(0)' : 'translateY(8px)', transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#8b72e0,#4b96e8)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Magicpen size={12} color="#fff" variant="Bold" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Flow</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>now</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>Leave in 15 minutes to avoid traffic</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 12 }}>Your commute via Metro Line 2 takes ~32 min. Traffic is building on alternate routes.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Done', primary: true, action: () => { setShowNotif(false); showToast('✓ Done — commute logged'); } },
              { label: 'Snooze 15m', primary: false, action: () => { setShowNotif(false); showToast('⏱ Reminder in 15 minutes'); } },
              { label: 'View Plan', primary: false, action: () => setShowNotif(false) },
            ].map(b => (
              <button key={b.label} onClick={b.action} style={{ flex: 1, background: b.primary ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)', border: `1px solid ${b.primary ? 'transparent' : 'rgba(255,255,255,0.15)'}`, borderRadius: 10, color: b.primary ? '#0a0a0a' : '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, padding: '8px 4px', cursor: 'pointer' }}>{b.label}</button>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Tap Done or swipe up to unlock</div>
      </div>

      {/* Voice overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 100, opacity: showVoice ? 1 : 0, pointerEvents: showVoice ? 'all' : 'none', transition: 'opacity 0.25s ease' }}>
        <div style={{ width: 'calc(100% - 32px)', background: '#fff', borderRadius: 20, padding: '20px 20px 16px', boxShadow: '0 12px 40px rgba(0,0,0,.14)', transform: showVoice ? 'translateY(0)' : 'translateY(16px)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Microphone2 size={14} color="#8b72e0" variant="Linear" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Flow is listening…</span>
          </div>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 12 }}>
            {[12, 22, 30, 36, 30, 22, 14, 26, 32, 18].map((h, i) => (
              <div key={i} className="animate-wave" style={{ width: 3, height: h, background: '#8b72e0', borderRadius: 2, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#0a0a0a', textAlign: 'center', minHeight: 22, marginBottom: 12 }}>
            {voiceTranscript}
            {showVoice && <span className="animate-blink" style={{ display: 'inline-block', width: 2, height: 15, background: '#3EAF78', marginLeft: 2, borderRadius: 1, verticalAlign: 'text-bottom' }} />}
          </div>
          <button onClick={closeVoice} style={{ width: '100%', background: '#f5f5f5', border: 'none', borderRadius: 12, color: '#888', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, padding: 10, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>

      {/* Add task sheet */}
      <BottomSheet visible={showAdd} onDismiss={() => setShowAdd(false)}>
        <SheetHandle />
        <SheetTitle>New Task</SheetTitle>
        <input ref={addInputRef} value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder="What do you need to do?" style={inputSt} />
        <input value={taskTime} onChange={e => setTaskTime(e.target.value)} placeholder="Time (e.g. 5:00 PM)" style={{ ...inputSt, marginTop: 0 }} />
        <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
          {(['reminder', 'event'] as const).map(t => (
            <button key={t} onClick={() => setTaskType(t)} style={{ flex: 1, borderRadius: 10, border: '1px solid #e8e8e8', background: taskType === t ? '#0a0a0a' : '#f5f5f5', color: taskType === t ? '#fff' : '#888', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, padding: '8px 0', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        <button onClick={addTask} style={primaryBtn}>Add to Flow</button>
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet visible={showEdit} onDismiss={() => setShowEdit(false)}>
        <SheetHandle />
        <SheetTitle>Edit Task</SheetTitle>
        <input value={editInput} onChange={e => setEditInput(e.target.value)} placeholder="Task name" style={inputSt} />
        <input value={editTimeVal} onChange={e => setEditTimeVal(e.target.value)} placeholder="Time" style={{ ...inputSt, marginTop: 0, marginBottom: 14 }} />
        <button onClick={saveEdit} style={primaryBtn}>Save Changes</button>
      </BottomSheet>

      {/* Report sheet */}
      <BottomSheet visible={showReport} onDismiss={() => setShowReport(false)} tall>
        <SheetHandle />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <SheetTitle>Your Report</SheetTitle>
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Magicpen size={10} color="#3EAF78" variant="Linear" /> Generated by Flow
            </div>
          </div>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setReportPeriod(p)} style={{ borderRadius: 8, border: 'none', padding: '4px 10px', background: reportPeriod === p ? '#0a0a0a' : 'transparent', color: reportPeriod === p ? '#fff' : '#888', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <StatCard label="Tasks done" value={`${stats.tasksCompleted}/${stats.tasksTotal}`} sub={`${completionPct}% completion`} />
          <StatCard label="On-time commutes" value={`${stats.onTimeCommutes}/${stats.totalCommutes}`} sub={`${commutePct}% on time`} />
          <StatCard label="Avg. leave time" value={stats.avgLeaveTime} sub="vs. 7:40 target" />
          <StatCard label="Reminders handled" value={`${stats.remindersHandled}`} sub={`${stats.remindersSnoozed} snoozed`} />
        </div>
        <div style={{ background: '#f8f8f8', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: '1px solid #efefef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#888' }}>Longest streak</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a' }}>{stats.longestStreak}</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#888' }}>Wellbeing score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 5, background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${stats.moodScore}%`, height: '100%', background: '#0a0a0a', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a' }}>{stats.moodScore}</span>
            </div>
          </div>
        </div>
        <div style={{ background: '#f0ecff', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 7, alignItems: 'flex-start', border: '1px solid #e4deff' }}>
          <Magicpen size={12} color="#8b72e0" variant="Linear" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#5a4a8a', lineHeight: 1.5 }}>
            {reportPeriod === 'weekly'
              ? 'You completed 82% of your tasks — your best week yet. Flow suggests scheduling medication 10 min earlier.'
              : 'This month you cut average commute delays by 6 min. Routine adherence improved 14% vs last month.'}
          </span>
        </div>
        <button onClick={handleDownload} disabled={downloadState === 'loading'} style={{ width: '100%', border: 'none', borderRadius: 14, background: downloadState === 'done' ? '#2c9e5e' : downloadState === 'loading' ? '#999' : '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: 14, cursor: downloadState === 'loading' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.3s' }}>
          {downloadState === 'done' ? '✓ Downloaded' : downloadState === 'loading' ? 'Generating…' : `⬇  Download ${reportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Report`}
        </button>
      </BottomSheet>

      {/* Toast */}
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? 0 : 12}px)`, background: '#0a0a0a', color: '#fff', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', opacity: toastVisible ? 1 : 0, transition: 'all 0.3s ease', zIndex: 300, pointerEvents: 'none' }}>{toast}</div>

      {/* Home indicator — desktop phone frame only */}
      {!isMobile && <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 120, height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 3 }} />}
    </>
  );

  // ── Mobile: full-screen native app ───────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, fontFamily: 'var(--font-dm-sans, system-ui)', background: '#fafafa', overflow: 'hidden' }}>
        {appContent}
      </div>
    );
  }

  // ── Desktop: phone-frame preview ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans, system-ui)', background: '#ebebeb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: 390, height: 844, background: '#1a1a1a', borderRadius: 54, position: 'relative', boxShadow: '0 0 0 1px #2a2a2a, 0 0 0 2px #0a0a0a, 0 40px 80px rgba(0,0,0,.35), 0 20px 40px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', left: -3, top: 140, width: 4, height: 36, background: '#2a2a2a', borderRadius: '2px 0 0 2px', boxShadow: '0 52px 0 #2a2a2a, 0 100px 0 #2a2a2a' }} />
        <div style={{ position: 'absolute', right: -3, top: 180, width: 4, height: 68, background: '#2a2a2a', borderRadius: '0 2px 2px 0' }} />
        <div style={{ position: 'absolute', inset: 6, borderRadius: 48, background: '#fafafa', overflow: 'hidden' }}>
          {/* Dynamic Island */}
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, background: '#0a0a0a', borderRadius: 20, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, background: '#1a1a1a', borderRadius: '50%' }} />
            <div style={{ width: 11, height: 11, background: '#1c1c1c', borderRadius: '50%', border: '2px solid #2a2a2a' }} />
          </div>
          {/* Status bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'flex-end', padding: '0 28px 8px', justifyContent: 'space-between', zIndex: 99, background: '#fafafa' }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px', color: '#0a0a0a' }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StatusIcons /></div>
          </div>
          {appContent}
        </div>
      </div>
    </div>
  );
}

// ─── Shared style objects ─────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 12, border: '1px solid #ebebeb', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const navBtnStyle:  React.CSSProperties = { width: 44, height: 44, borderRadius: 14, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const inputSt: React.CSSProperties = { width: '100%', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 15, color: '#0a0a0a', outline: 'none', marginBottom: 10, display: 'block' };
const primaryBtn: React.CSSProperties = { width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 15, fontWeight: 600, padding: 14, cursor: 'pointer' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlowIllustration() {
  return (
    <svg width="68" height="58" viewBox="0 0 68 58" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 2 }}>
      {/* Curved commute route */}
      <path d="M6 46 Q18 18 34 30 Q50 42 62 12" stroke="#7c6ee0" strokeWidth="1.6" strokeDasharray="3.5 2.5" strokeLinecap="round" opacity="0.45" />
      {/* Origin dot */}
      <circle cx="6" cy="46" r="3.5" stroke="#7c6ee0" strokeWidth="1.5" fill="none" opacity="0.55" />
      <circle cx="6" cy="46" r="1.2" fill="#7c6ee0" opacity="0.4" />
      {/* Destination pin */}
      <path d="M62 6 C58.5 6 56 8.5 56 12 C56 16.5 62 22 62 22 C62 22 68 16.5 68 12 C68 8.5 65.5 6 62 6Z" stroke="#7c6ee0" strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="62" cy="12" r="1.8" fill="#7c6ee0" opacity="0.45" />
      {/* Sparkle top-left */}
      <line x1="22" y1="8" x2="22" y2="3" stroke="#7c6ee0" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      <line x1="19.5" y1="5.5" x2="24.5" y2="5.5" stroke="#7c6ee0" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      {/* Sparkle bottom-right */}
      <line x1="48" y1="50" x2="48" y2="46" stroke="#7c6ee0" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="46" y1="48" x2="50" y2="48" stroke="#7c6ee0" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      {/* Diamond accent mid-path */}
      <path d="M34 16 L36.5 20 L34 24 L31.5 20 Z" stroke="#7c6ee0" strokeWidth="1.3" fill="none" opacity="0.38" />
      {/* Small circle stop */}
      <circle cx="34" cy="30" r="2.5" stroke="#7c6ee0" strokeWidth="1.3" fill="none" opacity="0.35" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c8c8c8', padding: '12px 24px 0' }}>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '32px 0', color: '#c0c0c0', fontSize: 13 }}>{text}</div>;
}

function TaskRow({ task, deleting, onDone, onSnooze, onDelete, onEdit, showCategory }: {
  task: Task; deleting: boolean;
  onDone: () => void; onSnooze: () => void; onDelete: () => void; onEdit: () => void;
  showCategory: boolean;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activated = useRef(false);
  const THRESHOLD = 80;

  const clearLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };

  const onPtrDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showMenu) { setShowMenu(false); return; }
    startX.current = e.clientX;
    startY.current = e.clientY;
    activated.current = false;
    lpTimer.current = setTimeout(() => { activated.current = true; setShowMenu(true); }, 500);
  };

  const onPtrMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - startX.current;
    const dy = Math.abs(e.clientY - startY.current);
    if (Math.abs(dx) > 6 || dy > 6) clearLP();
    if (Math.abs(dx) > 10 && dy < 30) {
      setDragging(true);
      setDragX(Math.sign(dx) * Math.min(Math.abs(dx), THRESHOLD * 1.4));
    }
  };

  const onPtrUp = () => {
    clearLP();
    if (!activated.current) {
      if (dragX >= THRESHOLD) onDone();
      else if (dragX <= -THRESHOLD) onDelete();
    }
    setDragX(0);
    setDragging(false);
    activated.current = false;
  };

  const progress = Math.min(Math.abs(dragX) / THRESHOLD, 1);
  const cat = task.category ? CATEGORY_STYLE[task.category] : null;
  const IconComp: Icon | null = task.iconName ? (TASK_ICON_MAP[task.iconName] ?? null) : null;

  return (
    <div className={deleting ? 'item-deleting' : ''}
      style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px dashed #ededed' }}>

      {/* Swipe-right reveal: done */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(61,170,110,${dragX > 0 ? progress * 0.2 : 0})`,
        display: 'flex', alignItems: 'center', paddingLeft: 14,
        transition: dragging ? 'none' : 'background 0.3s',
      }}>
        <TickCircle size={18} color="#3daa6e" variant="Bulk"
          style={{ opacity: dragX > 0 ? progress : 0, transition: dragging ? 'none' : 'opacity 0.3s' }} />
      </div>

      {/* Swipe-left reveal: delete */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(224,82,82,${dragX < 0 ? progress * 0.2 : 0})`,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 14,
        transition: dragging ? 'none' : 'background 0.3s',
      }}>
        <Trash size={18} color="#e05252" variant="Bulk"
          style={{ opacity: dragX < 0 ? progress : 0, transition: dragging ? 'none' : 'opacity 0.3s' }} />
      </div>

      {/* Row */}
      <div
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerCancel={onPtrUp}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
          cursor: 'grab', position: 'relative', opacity: task.done ? 0.45 : 1,
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          background: '#fafafa', touchAction: 'pan-y', userSelect: 'none',
        }}
      >
        <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {IconComp
            ? <IconComp size={26} color={task.iconColor} variant="Bulk" />
            : <span style={{ fontSize: 22, lineHeight: 1 }}>{task.icon}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.2px', textDecoration: task.done ? 'line-through' : 'none', color: task.done ? '#c0c0c0' : '#0a0a0a' }}>
            {task.title}
            {task.snoozed && <span style={{ fontSize: 10, fontWeight: 600, background: '#fffbeb', color: '#b45309', borderRadius: 5, padding: '2px 5px', marginLeft: 6 }}>+15m</span>}
          </div>
          <div style={{ fontSize: 11, color: '#b0b0b0', marginTop: 2 }}>{task.sub}</div>
        </div>
        {showCategory && cat
          ? <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', background: cat.bg, color: cat.color, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>{cat.label}</span>
          : <span style={{ fontSize: 13, color: '#c0c0c0', flexShrink: 0 }}>{task.time}</span>
        }
      </div>

      {/* Long-press context menu */}
      {showMenu && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20,
          display: 'flex', gap: 5, background: 'rgba(250,250,250,0.97)',
          padding: '4px 6px', borderRadius: 12,
          boxShadow: '0 3px 16px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>
          <ABtn onClick={e => { e.stopPropagation(); setShowMenu(false); onEdit(); }} hoverBg="#f5f5f5" hoverColor="#555">
            <Edit2 size={14} color="currentColor" variant="Linear" />
          </ABtn>
          <ABtn onClick={e => { e.stopPropagation(); setShowMenu(false); onSnooze(); }} hoverBg="#fffbeb" hoverColor="#d97706">
            <Clock size={14} color="currentColor" variant="Linear" />
          </ABtn>
        </div>
      )}
    </div>
  );
}

function ABtn({ onClick, children, hoverBg, hoverColor }: { onClick: (e: React.MouseEvent) => void; children: React.ReactNode; hoverBg: string; hoverColor: string }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #ebebeb', background: h ? hoverBg : '#fafafa', color: h ? hoverColor : '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

function BottomSheet({ visible, onDismiss, children, tall }: { visible: boolean; onDismiss: () => void; children: React.ReactNode; tall?: boolean }) {
  return (
    <div onClick={onDismiss} style={{ position: 'absolute', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', opacity: visible ? 1 : 0, pointerEvents: visible ? 'all' : 'none', transition: 'opacity 0.25s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '22px 22px 0 0', padding: tall ? '20px 20px 36px' : '20px 20px 32px', maxHeight: tall ? '88%' : '70%', overflowY: tall ? 'auto' : 'visible', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {children}
      </div>
    </div>
  );
}

function SheetHandle() {
  return <div style={{ width: 40, height: 4, background: '#e8e8e8', borderRadius: 2, margin: '0 auto 18px' }} />;
}

function SheetTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 17, fontWeight: 700, color: '#0a0a0a', marginBottom: 14, letterSpacing: '-0.4px' }}>{children}</div>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: '#f8f8f8', borderRadius: 12, padding: '10px 12px', border: '1px solid #efefef' }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#c0c0c0', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function CtrlBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 20, padding: '8px 16px', fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 12, fontWeight: 500, color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      {children}
    </button>
  );
}

function StatusIcons() {
  return (
    <>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none"><rect x="0" y="7" width="3" height="5" rx="1" fill="#0a0a0a"/><rect x="4.5" y="5" width="3" height="7" rx="1" fill="#0a0a0a"/><rect x="9" y="2.5" width="3" height="9.5" rx="1" fill="#0a0a0a"/><rect x="13.5" y="0" width="3" height="12" rx="1" fill="#0a0a0a"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 10a1 1 0 110 2 1 1 0 010-2z" fill="#0a0a0a"/><path d="M5.17 7.83a4 4 0 015.66 0" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round"/><path d="M2.34 5a8 8 0 0111.32 0" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round"/></svg>
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#0a0a0a"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#0a0a0a"/><path d="M23 4.5v3a1.5 1.5 0 000-3z" fill="#0a0a0a"/></svg>
    </>
  );
}
