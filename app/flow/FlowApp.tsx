'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ProfileCircle, SearchNormal1, Calendar1,
  Microphone2, Chart, TickCircle, Clock, Edit2, Trash,
  Magicpen, Health, Sun1, Routing2, Briefcase, People,
  Coffee, Activity, Drop,
  CloudChange, Flash, Medal, LocationDiscover,
  type Icon,
} from 'iconsax-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  time: string;
  icon: string;
  iconName?: string;
  iconBg: string;
  iconColor: string;
  sub: string;
  done: boolean;
  snoozed: boolean;
  category?: 'commute' | 'meeting' | 'personal' | 'health';
}

// ─── Icon maps ────────────────────────────────────────────────────────────────

const TASK_ICON_MAP: Record<string, Icon> = {
  health: Health, sun: Sun1, drop: Drop, routing: Routing2,
  briefcase: Briefcase, people: People, coffee: Coffee,
  activity: Activity, mic: Microphone2, calendar: Calendar1,
};

const NUDGE_ICON_MAP: Record<string, Icon> = {
  routing: Routing2, health: Health, cloud: CloudChange,
  flash: Flash, medal: Medal, location: LocationDiscover,
};

// ─── Static data ──────────────────────────────────────────────────────────────

const WEEK_DAYS = [
  { abbr: 'MON', num: 21 }, { abbr: 'TUE', num: 22 }, { abbr: 'WED', num: 23 },
  { abbr: 'THU', num: 24 }, { abbr: 'FRI', num: 25 }, { abbr: 'SAT', num: 26 }, { abbr: 'SUN', num: 27 },
];

const INITIAL_REMINDERS: Task[] = [
  { id: 'r1', title: 'Take medication', time: '8:00 AM', icon: '💊', iconName: 'health', iconBg: '#fff2f0', iconColor: '#e05252', sub: 'Morning dose · Urgent', done: false, snoozed: false },
  { id: 'r2', title: 'Morning stretch', time: '7:15 AM', icon: '🌅', iconName: 'sun', iconBg: '#fffbeb', iconColor: '#d97706', sub: '10 minutes', done: false, snoozed: false },
  { id: 'r3', title: 'Drink water', time: '7:30 AM', icon: '💧', iconName: 'drop', iconBg: '#ede9fe', iconColor: '#C4B5FD', sub: '2 glasses before commute', done: false, snoozed: false },
  { id: 'r4', title: 'Call Mom', time: '6:00 PM', icon: '📞', iconName: 'people', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Weekly check-in', done: false, snoozed: false },
];

const INITIAL_EVENTS: Task[] = [
  { id: 'e1', title: 'Commute to office', time: '7:40 AM', icon: '🚇', iconName: 'routing', iconBg: '#ede9fe', iconColor: '#C4B5FD', sub: 'Leave by 7:40 AM · 32 min', done: false, snoozed: false, category: 'commute' },
  { id: 'e2', title: 'Team standup', time: '9:00 AM', icon: '💼', iconName: 'briefcase', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Google Meet · 15 min', done: false, snoozed: false, category: 'meeting' },
  { id: 'e3', title: 'Lunch break', time: '1:00 PM', icon: '🥗', iconName: 'coffee', iconBg: '#edfaf3', iconColor: '#3daa6e', sub: '1:00 PM · 45 min', done: false, snoozed: false, category: 'personal' },
  { id: 'e4', title: 'Product review', time: '3:00 PM', icon: '🎙', iconName: 'people', iconBg: '#f4f0ff', iconColor: '#8b72e0', sub: 'Conference room B · 1h', done: false, snoozed: false, category: 'meeting' },
  { id: 'e5', title: 'Evening run', time: '5:30 PM', icon: '🏃', iconName: 'activity', iconBg: '#edfaf3', iconColor: '#3daa6e', sub: '5:30 PM · 30 min', done: false, snoozed: false, category: 'personal' },
];

const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  commute: { bg: '#ede9fe', color: '#C4B5FD', label: 'Commute' },
  meeting: { bg: '#f4f0ff', color: '#8b72e0', label: 'Meeting' },
  personal: { bg: '#edfaf3', color: '#3daa6e', label: 'Personal' },
  health:   { bg: '#fff2f0', color: '#e05252', label: 'Health' },
};

const VOICE_PHRASES = [
  'Add meeting at 5 PM',
  'Remind me to take medicine at 8 AM',
  'Event with design team tomorrow',
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

const COMMUTE_DATA = {
  from: 'Home',
  to: 'Office',
  leaveBy: '7:40 AM',
  arriveBy: '8:12 AM',
  duration: '32 min',
  steps: [
    { icon: '🚶', label: 'Walk to Metro Station', duration: '5 min', sub: 'Approx 400m' },
    { icon: '🚇', label: 'Metro Line 2', duration: '22 min', sub: 'Towards Downtown' },
    { icon: '🚶', label: 'Walk to Office', duration: '5 min', sub: 'From Downtown Station' },
  ],
  aiSuggestions: [
    { iconName: 'routing', text: 'Traffic 18% heavier. Leave at 7:35 to stay on time.', tag: 'Commute' },
    { iconName: 'location', text: 'Metro Line 2 delayed. Bus 42 saves 8 min.', tag: 'Alert' },
    { iconName: 'cloud', text: 'Light rain at 7:40 AM. Pack an umbrella today.', tag: 'Weather' },
  ],
};

function detectCategory(text: string): 'reminder' | 'event' | null {
  const lower = text.toLowerCase();
  if (lower.includes('remind')) return 'reminder';
  if (lower.includes('event') || lower.includes('meeting') || lower.includes('appointment')) return 'event';
  return null;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlowApp() {
  const [activeTab, setActiveTab]         = useState<'reminders' | 'events'>('reminders');
  const [reminders, setReminders]         = useState<Task[]>(INITIAL_REMINDERS);
  const [events, setEvents]               = useState<Task[]>(INITIAL_EVENTS);
  const [showNotif, setShowNotif]         = useState(false);
  const [showAdd, setShowAdd]             = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [showCommute, setShowCommute]     = useState(false);
  const [reportPeriod, setReportPeriod]   = useState<'weekly' | 'monthly'>('weekly');
  const [editTarget, setEditTarget]       = useState<Task | null>(null);
  const [toast, setToast]                 = useState('');
  const [toastVisible, setToastVisible]   = useState(false);
  const [taskType, setTaskType]           = useState<'reminder' | 'event'>('reminder');
  const [taskInput, setTaskInput]         = useState('');
  const [taskTime, setTaskTime]           = useState('');
  const [taskDetails, setTaskDetails]     = useState('');
  const [isListening, setIsListening]     = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [editInput, setEditInput]         = useState('');
  const [editTimeVal, setEditTimeVal]     = useState('');
  const [selectedDay, setSelectedDay]     = useState(22);
  const [deletingIds, setDeletingIds]     = useState<Set<string>>(new Set());
  const [nudgeIdx, setNudgeIdx]           = useState(0);
  const [nudgeFading, setNudgeFading]     = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [isMobile, setIsMobile]           = useState(false);
  const [showLockScreen, setShowLockScreen] = useState(false);

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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

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

  const stopModalMic = useCallback(() => {
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setIsListening(false);
    setVoiceTranscript('');
  }, []);

  const closeAddModal = useCallback(() => {
    stopModalMic();
    setShowAdd(false);
    setTaskInput('');
    setTaskTime('');
    setTaskDetails('');
  }, [stopModalMic]);

  const handleTaskInputChange = (val: string) => {
    setTaskInput(val);
    const detected = detectCategory(val);
    if (detected) setTaskType(detected);
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    const detected = detectCategory(taskInput);
    const type = detected ?? taskType;
    const bgs = ['#fffbeb', '#edf4ff', '#edfaf3', '#f4f0ff', '#fff2f0'];
    const newTask: Task = {
      id: uid(), title: taskInput.trim(),
      time: taskTime.trim() || 'Anytime', icon: type === 'reminder' ? '🔔' : '📅',
      iconBg: bgs[Math.floor(Math.random() * bgs.length)], iconColor: '#888',
      sub: taskDetails.trim() || 'Just added', done: false, snoozed: false,
    };
    if (type === 'reminder') { setReminders(r => [...r, newTask]); setActiveTab('reminders'); }
    else { setEvents(e => [...e, newTask]); setActiveTab('events'); }
    setTaskInput(''); setTaskTime(''); setTaskDetails('');
    setShowAdd(false); showToast('✓ Added to Flow');
  };

  const openModalMic = () => {
    setIsListening(true);
    setVoiceTranscript('');
    const phrase = VOICE_PHRASES[Math.floor(Math.random() * VOICE_PHRASES.length)];
    let i = 0;
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setTimeout(() => {
      voiceTimer.current = setInterval(() => {
        if (i < phrase.length) {
          const partial = phrase.slice(0, ++i);
          setVoiceTranscript(partial);
          setTaskInput(partial);
          const detected = detectCategory(partial);
          if (detected) setTaskType(detected);
        } else {
          if (voiceTimer.current) clearInterval(voiceTimer.current);
          setTimeout(() => setIsListening(false), 600);
        }
      }, 60);
    }, 400);
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
      if (e.key === 'Escape') {
        setShowNotif(false); closeAddModal(); setShowEdit(false);
        setShowReport(false); setShowCommute(false); setShowLockScreen(false);
      }
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
              {reminders.length === 0 && <EmptyState text="No reminders — tap the mic to add one" />}
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fafafa', borderTop: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 36, paddingRight: 36, paddingTop: 16, paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24, zIndex: 50 }}>
        <button onClick={() => setShowReport(true)} style={{ ...navBtnStyle, background: '#f0f0f0' }}>
          <Chart size={18} color="#888" variant="Linear" />
        </button>
        {/* Center: unified add+voice button */}
        <button onClick={() => setShowAdd(true)} style={{ width: 54, height: 54, borderRadius: 18, background: '#0a0a0a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
          <Microphone2 size={22} color="#fff" variant="Linear" />
        </button>
        {/* Right: commute view */}
        <button onClick={() => setShowCommute(true)} style={{ ...navBtnStyle, background: '#f0f0f0' }}>
          <Routing2 size={18} color="#888" variant="Linear" />
        </button>
      </div>

      {/* Notification overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'linear-gradient(160deg,#1c2331 0%,#0f1623 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, opacity: showNotif ? 1 : 0, pointerEvents: showNotif ? 'all' : 'none', transition: 'opacity 0.35s ease' }}>
        <div style={{ fontSize: 72, fontWeight: 300, color: '#fff', lineHeight: 1, letterSpacing: -3, marginTop: 20 }}>7:28</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Tuesday, April 22</div>
        <div style={{ width: 'calc(100% - 32px)', marginTop: 32, background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, padding: '14px 16px', transform: showNotif ? 'translateY(0)' : 'translateY(8px)', transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#8b72e0,#C4B5FD)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* ── Unified Add + Voice modal ────────────────────────────────────────────── */}
      <BottomSheet visible={showAdd} onDismiss={closeAddModal}>
        <SheetHandle />
        <SheetTitle>Add to Flow</SheetTitle>

        {/* Voice section */}
        <div style={{ background: isListening ? '#f0ecff' : '#f8f8f8', borderRadius: 14, padding: '16px 14px', marginBottom: 14, border: `1px solid ${isListening ? '#e4deff' : '#efefef'}`, transition: 'all 0.25s ease', textAlign: 'center' }}>
          <button
            onClick={isListening ? stopModalMic : openModalMic}
            className={isListening ? 'mic-listening' : ''}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: isListening ? '#8b72e0' : '#efefef',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', margin: '0 auto 8px',
              transition: 'all 0.25s ease',
            }}
          >
            <Microphone2 size={22} color={isListening ? '#fff' : '#8b72e0'} variant={isListening ? 'Bold' : 'Linear'} />
          </button>
          <div style={{ fontSize: 11, fontWeight: 600, color: isListening ? '#8b72e0' : '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.25s' }}>
            {isListening ? 'Flow is listening…' : 'Tap to speak'}
          </div>
          {isListening && (
            <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 10 }}>
              {[10, 18, 26, 32, 26, 18, 12, 22, 28, 16].map((h, i) => (
                <div key={i} className="animate-wave" style={{ width: 3, height: h, background: '#8b72e0', borderRadius: 2, animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          )}
          {voiceTranscript && !isListening && (
            <div style={{ fontSize: 12, color: '#7c6ee0', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
              &ldquo;{voiceTranscript}&rdquo;
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#ebebeb' }} />
          <span style={{ fontSize: 11, color: '#c8c8c8', fontWeight: 500 }}>or type</span>
          <div style={{ flex: 1, height: 1, background: '#ebebeb' }} />
        </div>

        {/* Inputs */}
        <input
          ref={addInputRef}
          value={taskInput}
          onChange={e => handleTaskInputChange(e.target.value)}
          placeholder="What do you need to add?"
          style={inputSt}
        />
        <div style={{ fontSize: 11, color: '#c0c0c0', marginTop: -6, marginBottom: 10, paddingLeft: 2 }}>
          Say &ldquo;Reminder&rdquo; or &ldquo;Event&rdquo; to categorize
        </div>
        <input value={taskTime} onChange={e => setTaskTime(e.target.value)} placeholder="Time (e.g. 5:00 PM)" style={inputSt} />
        <input value={taskDetails} onChange={e => setTaskDetails(e.target.value)} placeholder="Optional details" style={{ ...inputSt, marginBottom: 0 }} />

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
          {(['reminder', 'event'] as const).map(t => (
            <button key={t} onClick={() => setTaskType(t)} style={{ flex: 1, borderRadius: 10, border: '1px solid #e8e8e8', background: taskType === t ? '#0a0a0a' : '#f5f5f5', color: taskType === t ? '#fff' : '#888', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, padding: '8px 0', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>{t}</button>
          ))}
        </div>

        <button onClick={addTask} style={primaryBtn}>Add to Flow</button>
        <button onClick={closeAddModal} style={secondaryBtn}>Cancel</button>
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

      {/* ── Commute full-screen page ─────────────────────────────────────────────── */}
      <CommuteScreen visible={showCommute} onBack={() => setShowCommute(false)} isMobile={isMobile} />

      {/* Toast */}
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? 0 : 12}px)`, background: '#0a0a0a', color: '#fff', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', opacity: toastVisible ? 1 : 0, transition: 'all 0.3s ease', zIndex: 300, pointerEvents: 'none' }}>{toast}</div>

      {!isMobile && <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 120, height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 3 }} />}

      {/* Lock screen overlay — rendered inside phone frame */}
      {!isMobile && <LockScreenOverlay visible={showLockScreen} onClose={() => setShowLockScreen(false)} />}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, fontFamily: 'var(--font-dm-sans, system-ui)', background: '#fafafa', overflow: 'hidden' }}>
        {appContent}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans, system-ui)', background: '#ebebeb', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: 390, height: 844, background: '#1a1a1a', borderRadius: 54, position: 'relative', boxShadow: '0 0 0 1px #2a2a2a, 0 0 0 2px #0a0a0a, 0 40px 80px rgba(0,0,0,.35), 0 20px 40px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', left: -3, top: 140, width: 4, height: 36, background: '#2a2a2a', borderRadius: '2px 0 0 2px', boxShadow: '0 52px 0 #2a2a2a, 0 100px 0 #2a2a2a' }} />
        <div style={{ position: 'absolute', right: -3, top: 180, width: 4, height: 68, background: '#2a2a2a', borderRadius: '0 2px 2px 0' }} />
        <div style={{ position: 'absolute', inset: 6, borderRadius: 48, background: '#fafafa', overflow: 'hidden', transform: 'translateZ(0)', clipPath: 'inset(0 round 48px)' }}>
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

      {/* View Notifications button — web only */}
      <button
        onClick={() => setShowLockScreen(true)}
        style={{
          marginTop: 28,
          background: '#fff',
          border: '1px solid #d8d8d8',
          borderRadius: 24,
          padding: '11px 26px',
          fontSize: 14,
          fontWeight: 600,
          color: '#222',
          cursor: 'pointer',
          fontFamily: 'var(--font-dm-sans, system-ui)',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          letterSpacing: '-0.2px',
          transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(0,0,0,0.14)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
      >
        <svg width="16" height="17" viewBox="0 0 16 17" fill="none">
          <path d="M8 1.5C5.79 1.5 4 3.24 4 5.38v3.75L2.5 11h11L12 9.13V5.38C12 3.24 10.21 1.5 8 1.5z" stroke="#222" strokeWidth="1.45" strokeLinejoin="round" fill="none"/>
          <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="#222" strokeWidth="1.45" strokeLinecap="round"/>
        </svg>
        View Notifications
      </button>

    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 12, border: '1px solid #ebebeb', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const navBtnStyle:  React.CSSProperties = { width: 44, height: 44, borderRadius: 14, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const inputSt: React.CSSProperties = { width: '100%', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 15, color: '#0a0a0a', outline: 'none', marginBottom: 10, display: 'block', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 15, fontWeight: 600, padding: 14, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { width: '100%', background: 'transparent', color: '#aaa', border: 'none', borderRadius: 14, fontFamily: 'var(--font-dm-sans, system-ui)', fontSize: 14, fontWeight: 500, padding: '10px 14px', cursor: 'pointer', marginTop: 6 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlowIllustration() {
  return (
    <svg width="68" height="58" viewBox="0 0 68 58" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M6 46 Q18 18 34 30 Q50 42 62 12" stroke="#7c6ee0" strokeWidth="1.6" strokeDasharray="3.5 2.5" strokeLinecap="round" opacity="0.45" />
      <circle cx="6" cy="46" r="3.5" stroke="#7c6ee0" strokeWidth="1.5" fill="none" opacity="0.55" />
      <circle cx="6" cy="46" r="1.2" fill="#7c6ee0" opacity="0.4" />
      <path d="M62 6 C58.5 6 56 8.5 56 12 C56 16.5 62 22 62 22 C62 22 68 16.5 68 12 C68 8.5 65.5 6 62 6Z" stroke="#7c6ee0" strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="62" cy="12" r="1.8" fill="#7c6ee0" opacity="0.45" />
      <line x1="22" y1="8" x2="22" y2="3" stroke="#7c6ee0" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      <line x1="19.5" y1="5.5" x2="24.5" y2="5.5" stroke="#7c6ee0" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      <line x1="48" y1="50" x2="48" y2="46" stroke="#7c6ee0" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="46" y1="48" x2="50" y2="48" stroke="#7c6ee0" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <path d="M34 16 L36.5 20 L34 24 L31.5 20 Z" stroke="#7c6ee0" strokeWidth="1.3" fill="none" opacity="0.38" />
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
      <div style={{ position: 'absolute', inset: 0, background: `rgba(61,170,110,${dragX > 0 ? progress * 0.2 : 0})`, display: 'flex', alignItems: 'center', paddingLeft: 14, transition: dragging ? 'none' : 'background 0.3s' }}>
        <TickCircle size={18} color="#3daa6e" variant="Bulk" style={{ opacity: dragX > 0 ? progress : 0, transition: dragging ? 'none' : 'opacity 0.3s' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(224,82,82,${dragX < 0 ? progress * 0.2 : 0})`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 14, transition: dragging ? 'none' : 'background 0.3s' }}>
        <Trash size={18} color="#e05252" variant="Bulk" style={{ opacity: dragX < 0 ? progress : 0, transition: dragging ? 'none' : 'opacity 0.3s' }} />
      </div>
      <div
        onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerCancel={onPtrUp}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'grab', position: 'relative', opacity: task.done ? 0.45 : 1, transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', background: '#fafafa', touchAction: 'pan-y', userSelect: 'none' }}
      >
        <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {IconComp ? <IconComp size={26} color={task.iconColor} variant="Bulk" /> : <span style={{ fontSize: 22, lineHeight: 1 }}>{task.icon}</span>}
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
      {showMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20, display: 'flex', gap: 5, background: 'rgba(250,250,250,0.97)', padding: '4px 6px', borderRadius: 12, boxShadow: '0 3px 16px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)' }}>
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
    <div onClick={onDismiss} style={{ position: 'absolute', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', opacity: visible ? 1 : 0, pointerEvents: visible ? 'all' : 'none', transition: 'opacity 0.25s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '22px 22px 0 0', padding: tall ? '20px 20px 36px' : '20px 20px 32px', maxHeight: tall ? '88%' : '75%', overflowY: 'auto', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
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

function CommuteScreen({ visible, onBack, isMobile }: { visible: boolean; onBack: () => void; isMobile: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 120,
      background: '#fafafa',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(24px)',
      transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: visible ? 'all' : 'none',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: isMobile ? 'max(52px, env(safe-area-inset-top))' : 68,
        paddingLeft: 20, paddingRight: 20, paddingBottom: 12,
        background: '#fafafa',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 12,
          background: '#f5f5f5', border: '1px solid #ebebeb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12.5L5.5 8 10 3.5" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.4px', lineHeight: 1.15 }}>Your Commute</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>Tuesday, April 22 · Leave by 7:40 AM</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#C4B5FD', letterSpacing: '-0.6px', lineHeight: 1 }}>32 min</div>
          <div style={{ fontSize: 10, color: '#b0b0b0', marginTop: 1 }}>total</div>
        </div>
      </div>

      {/* Map */}
      <div style={{ position: 'relative', flexShrink: 0, height: 220, overflow: 'hidden' }}>
        <CommuteMap />

        {/* Leave by chip */}
        <div style={{
          position: 'absolute', bottom: 14, left: 16,
          background: '#3daa6e', borderRadius: 10, padding: '6px 11px',
          display: 'flex', alignItems: 'center', gap: 5,
          boxShadow: '0 2px 8px rgba(61,170,110,0.3)',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="#fff" strokeWidth="1.2"/>
            <path d="M5 3v2.2l1.4 1.4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Leave 7:40 AM</span>
        </div>

        {/* Arrive badge */}
        <div style={{
          position: 'absolute', bottom: 14, right: 16,
          background: '#fff', borderRadius: 12, padding: '8px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.13)', border: '1px solid #ebebeb',
        }}>
          <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arrive</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>8:12 AM</div>
        </div>

        {/* Metro line label on map */}
        <div style={{
          position: 'absolute', top: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(75,150,232,0.12)', borderRadius: 6,
          padding: '3px 8px', backdropFilter: 'blur(4px)',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4B5FD', letterSpacing: '0.04em' }}>METRO LINE 2</span>
        </div>
      </div>

      {/* Scrollable info */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', paddingBottom: isMobile ? 'max(32px, env(safe-area-inset-bottom))' : 32 }}>

        {/* Route steps */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Route Steps</div>
        <div style={{ background: '#f5f5f5', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
          {COMMUTE_DATA.steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px',
              borderBottom: i < COMMUTE_DATA.steps.length - 1 ? '1px solid #ebebeb' : 'none',
            }}>
              {/* Step icon with connector line */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: '#fff', border: '1px solid #e5e5e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  {step.icon}
                </div>
                {i < COMMUTE_DATA.steps.length - 1 && (
                  <div style={{ position: 'absolute', top: 36, width: 1.5, height: 14, background: '#ddd', left: '50%', transform: 'translateX(-50%)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>{step.label}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{step.sub}</div>
              </div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#C4B5FD', flexShrink: 0,
                background: '#ede9fe', padding: '4px 8px', borderRadius: 7,
              }}>{step.duration}</div>
            </div>
          ))}
        </div>

        {/* AI suggestions */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>AI Suggestions</div>
        {COMMUTE_DATA.aiSuggestions.map((s, i) => {
          const SuggIcon: Icon | null = NUDGE_ICON_MAP[s.iconName] ?? null;
          return (
            <div key={i} style={{
              background: '#f0ecff', borderRadius: 12, padding: '11px 13px', marginBottom: 8,
              display: 'flex', gap: 9, alignItems: 'flex-start', border: '1px solid #e4deff',
            }}>
              {SuggIcon && <SuggIcon size={14} color="#7c6ee0" variant="Bulk" style={{ marginTop: 1, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: '#5a4a8a', lineHeight: 1.5, flex: 1 }}>{s.text}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#8b72e0', flexShrink: 0,
                background: '#e4deff', padding: '3px 7px', borderRadius: 5, marginTop: 1,
              }}>{s.tag}</span>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function CommuteMap() {
  return (
    <svg
      width="100%" height="220"
      viewBox="0 0 390 220"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Map background */}
      <rect width="390" height="220" fill="#e9eef3" />

      {/* Subtle block fills between streets */}
      <rect x="0" y="0" width="55" height="37" fill="#dfe5eb" opacity="0.6" />
      <rect x="65" y="0" width="70" height="37" fill="#e2e8ed" opacity="0.5" />
      <rect x="145" y="0" width="60" height="37" fill="#dfe5eb" opacity="0.45" />
      <rect x="215" y="0" width="70" height="37" fill="#e2e8ed" opacity="0.5" />
      <rect x="295" y="0" width="40" height="37" fill="#dfe5eb" opacity="0.4" />
      <rect x="0" y="43" width="55" height="53" fill="#e2e8ed" opacity="0.5" />
      <rect x="65" y="43" width="70" height="53" fill="#dfe5eb" opacity="0.45" />
      <rect x="145" y="43" width="60" height="53" fill="#e2e8ed" opacity="0.5" />
      <rect x="215" y="43" width="70" height="53" fill="#dfe5eb" opacity="0.45" />
      <rect x="295" y="43" width="40" height="53" fill="#e2e8ed" opacity="0.4" />
      <rect x="345" y="43" width="45" height="53" fill="#dfe5eb" opacity="0.4" />
      <rect x="0" y="102" width="55" height="53" fill="#dfe5eb" opacity="0.45" />
      <rect x="65" y="102" width="70" height="53" fill="#e2e8ed" opacity="0.5" />
      <rect x="145" y="102" width="60" height="53" fill="#dfe5eb" opacity="0.4" />
      <rect x="215" y="102" width="70" height="53" fill="#e2e8ed" opacity="0.45" />
      <rect x="295" y="102" width="40" height="53" fill="#dfe5eb" opacity="0.4" />
      <rect x="345" y="102" width="45" height="53" fill="#e2e8ed" opacity="0.35" />
      <rect x="0" y="161" width="55" height="59" fill="#e2e8ed" opacity="0.5" />
      <rect x="65" y="161" width="70" height="59" fill="#dfe5eb" opacity="0.45" />
      <rect x="145" y="161" width="60" height="59" fill="#e2e8ed" opacity="0.4" />
      <rect x="215" y="161" width="70" height="59" fill="#dfe5eb" opacity="0.4" />

      {/* Horizontal roads */}
      <line x1="0" y1="40" x2="390" y2="40" stroke="#fff" strokeWidth="9"/>
      <line x1="0" y1="100" x2="390" y2="100" stroke="#fff" strokeWidth="7"/>
      <line x1="0" y1="160" x2="390" y2="160" stroke="#fff" strokeWidth="9"/>

      {/* Vertical roads */}
      <line x1="60" y1="0" x2="60" y2="220" stroke="#fff" strokeWidth="9"/>
      <line x1="140" y1="0" x2="140" y2="220" stroke="#fff" strokeWidth="7"/>
      <line x1="215" y1="0" x2="215" y2="220" stroke="#fff" strokeWidth="9"/>
      <line x1="295" y1="0" x2="295" y2="220" stroke="#fff" strokeWidth="7"/>
      <line x1="345" y1="0" x2="345" y2="220" stroke="#fff" strokeWidth="5"/>

      {/* Road centre lines (dashed) */}
      <line x1="0" y1="40" x2="390" y2="40" stroke="#e0e6eb" strokeWidth="1" strokeDasharray="6 5"/>
      <line x1="0" y1="100" x2="390" y2="100" stroke="#e0e6eb" strokeWidth="1" strokeDasharray="6 5"/>
      <line x1="0" y1="160" x2="390" y2="160" stroke="#e0e6eb" strokeWidth="1" strokeDasharray="6 5"/>

      {/* Street name labels */}
      <text x="195" y="36" textAnchor="middle" fontSize="7" fill="#c0c8d0" fontFamily="system-ui,sans-serif">CENTRAL AVE</text>
      <text x="195" y="96" textAnchor="middle" fontSize="7" fill="#c0c8d0" fontFamily="system-ui,sans-serif">MAIN STREET</text>
      <text x="195" y="156" textAnchor="middle" fontSize="7" fill="#c0c8d0" fontFamily="system-ui,sans-serif">PARK ROAD</text>

      {/* Route glow (drawn first, underneath) */}
      <path d="M50 195 L60 160" stroke="#C4B5FD" strokeWidth="12" strokeLinecap="round" opacity="0.1"/>
      <path d="M60 160 C95 152 120 85 215 78 C258 74 282 46 320 38" stroke="#C4B5FD" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.1"/>
      <path d="M320 38 L345 28" stroke="#C4B5FD" strokeWidth="12" strokeLinecap="round" opacity="0.1"/>

      {/* Walk segment: home → metro station */}
      <path d="M50 195 L60 160" stroke="#C4B5FD" strokeWidth="2.5" strokeDasharray="4.5 3" strokeLinecap="round"/>
      {/* Metro route */}
      <path d="M60 160 C95 152 120 85 215 78 C258 74 282 46 320 38" stroke="#C4B5FD" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Walk segment: metro → office */}
      <path d="M320 38 L345 28" stroke="#C4B5FD" strokeWidth="2.5" strokeDasharray="4.5 3" strokeLinecap="round"/>

      {/* Home marker */}
      <circle cx="50" cy="195" r="13" fill="#fff" opacity="0.9"/>
      <circle cx="50" cy="195" r="8" fill="#3daa6e"/>
      <circle cx="50" cy="195" r="16" stroke="#3daa6e" strokeWidth="2" fill="none" opacity="0.22"/>
      {/* Home icon dot */}
      <circle cx="50" cy="193" r="2.5" fill="#fff"/>

      {/* Metro station A (boarding) */}
      <circle cx="60" cy="160" r="7" fill="#fff"/>
      <circle cx="60" cy="160" r="4.5" fill="#C4B5FD"/>
      <circle cx="60" cy="160" r="9" stroke="#C4B5FD" strokeWidth="1.5" fill="none" opacity="0.3"/>

      {/* Metro mid-stop */}
      <circle cx="215" cy="78" r="5" fill="#fff"/>
      <circle cx="215" cy="78" r="3" fill="#C4B5FD"/>

      {/* Metro station B (alighting) */}
      <circle cx="320" cy="38" r="7" fill="#fff"/>
      <circle cx="320" cy="38" r="4.5" fill="#C4B5FD"/>
      <circle cx="320" cy="38" r="9" stroke="#C4B5FD" strokeWidth="1.5" fill="none" opacity="0.3"/>

      {/* Office pin */}
      <path d="M345 12 C340.5 12 337 15.5 337 20 C337 25.5 345 34 345 34 C345 34 353 25.5 353 20 C353 15.5 349.5 12 345 12Z" fill="#0a0a0a"/>
      <circle cx="345" cy="20" r="3.5" fill="#fff"/>

      {/* Labels */}
      <text x="50" y="213" textAnchor="middle" fontSize="8.5" fill="#3daa6e" fontWeight="700" fontFamily="system-ui,sans-serif">HOME</text>
      <text x="345" y="46" textAnchor="middle" fontSize="8.5" fill="#0a0a0a" fontWeight="700" fontFamily="system-ui,sans-serif">OFFICE</text>

      {/* Station labels */}
      <text x="75" y="155" fontSize="7.5" fill="#C4B5FD" fontWeight="600" fontFamily="system-ui,sans-serif">Park St.</text>
      <text x="313" y="32" fontSize="7.5" fill="#C4B5FD" fontWeight="600" fontFamily="system-ui,sans-serif" textAnchor="end">Downtown</text>
    </svg>
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

// ─── Lock Screen Overlay ──────────────────────────────────────────────────────

function LockScreenOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const startY = useRef(0);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset swipe when closed
  useEffect(() => { if (!visible) setSwipeY(0); }, [visible]);

  const handlePtrDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
  };
  const handlePtrMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = e.clientY - startY.current;
    if (dy < 0) setSwipeY(Math.max(dy, -180));
  };
  const handlePtrUp = () => {
    setIsDragging(false);
    if (swipeY < -80) { onClose(); } else { setSwipeY(0); }
  };

  const swipeProgress = Math.min(Math.abs(swipeY) / 180, 1);

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 9999,
        opacity: visible ? 1 - swipeProgress * 0.4 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transform: swipeY !== 0 ? `translateY(${swipeY * 0.6}px)` : 'translateY(0)',
        transition: isDragging ? 'none' : 'opacity 0.35s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        userSelect: 'none',
      }}
      onPointerDown={handlePtrDown}
      onPointerMove={handlePtrMove}
      onPointerUp={handlePtrUp}
      onPointerCancel={handlePtrUp}
      onClick={onClose}
    >
      {/* Wallpaper */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/wallpaper.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }} />

      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 26px 0',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Signal */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="7" width="3" height="5" rx="1" fill="white"/>
            <rect x="4.5" y="5" width="3" height="7" rx="1" fill="white"/>
            <rect x="9" y="2.5" width="3" height="9.5" rx="1" fill="white"/>
            <rect x="13.5" y="0" width="3" height="12" rx="1" fill="white"/>
          </svg>
          {/* WiFi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 10a1 1 0 110 2 1 1 0 010-2z" fill="white"/>
            <path d="M5.17 7.83a4 4 0 015.66 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M2.34 5a8 8 0 0111.32 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {/* Battery */}
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white"/>
            <rect x="2" y="2" width="16" height="8" rx="2" fill="white"/>
            <path d="M23 4.5v3a1.5 1.5 0 000-3z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Lock icon */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <svg width="30" height="36" viewBox="0 0 30 36" fill="none">
          <rect x="3" y="16" width="24" height="18" rx="5" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.12)"/>
          <path d="M8 16V11C8 7.69 11.13 5 15 5C18.87 5 22 7.69 22 11" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <circle cx="15" cy="25" r="2.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.25)"/>
        </svg>
      </div>

      {/* Time */}
      <div style={{
        position: 'absolute', top: 104, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 86,
        fontWeight: 300,
        color: '#fff',
        letterSpacing: -4,
        lineHeight: 1,
      }}>6:41</div>

      {/* Date */}
      <div style={{
        position: 'absolute', top: 204, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 19,
        fontWeight: 400,
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: '0.1px',
      }}>Wednesday, 22 April</div>

      {/* Notifications */}
      <div
        style={{ position: 'absolute', top: 270, left: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Notification 1 — Traffic */}
        <div
          className={visible ? 'notif-slide-1' : ''}
          style={{
            background: 'rgba(242,238,255,0.84)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderRadius: 18,
            padding: '13px 14px 12px',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pink.png" alt="" style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.25 }}>Traffic is heavier today</span>
                <span style={{ fontSize: 12, color: '#999', flexShrink: 0, marginTop: 1 }}>2m ago</span>
              </div>
              <div style={{ fontSize: 14, color: '#333', marginTop: 2, lineHeight: 1.35 }}>Leave at 7:35 to stay on time</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 11 }}>
            {(['Leave now', '10 min later'] as const).map(label => (
              <button
                key={label}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.88)',
                  border: '1px solid rgba(0,0,0,0.13)',
                  borderRadius: 22,
                  padding: '7px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#111',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Notification 2 — Message */}
        <div
          className={visible ? 'notif-slide-2' : ''}
          style={{
            background: 'rgba(242,238,255,0.84)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderRadius: 18,
            padding: '13px 14px',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photo.png" alt="" style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.25 }}>What&apos;s the occasion?</span>
                <span style={{ fontSize: 12, color: '#999', flexShrink: 0, marginTop: 1 }}>3m ago</span>
              </div>
              <div style={{ fontSize: 14, color: '#333', marginTop: 2, lineHeight: 1.35 }}>Can you bring a big salad? I&apos;m on dessert duty.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 52, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        padding: '0 52px',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Flashlight */}
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'rgba(110,110,120,0.52)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
            <path d="M7 4h8l1.5 7-5.5 4-5.5-4L7 4z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
            <rect x="7" y="15" width="8" height="8" rx="2.5" stroke="white" strokeWidth="1.6"/>
            <line x1="11" y1="17.5" x2="11" y2="20.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Camera */}
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'rgba(110,110,120,0.52)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <svg width="24" height="22" viewBox="0 0 24 22" fill="none">
            <rect x="2" y="6" width="20" height="15" rx="4" stroke="white" strokeWidth="1.6"/>
            <circle cx="12" cy="13.5" r="4" stroke="white" strokeWidth="1.6"/>
            <path d="M8 6l1.2-2.5h5.6L16 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="18.5" cy="9.5" r="1" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 14, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ width: 130, height: 5, background: 'rgba(255,255,255,0.82)', borderRadius: 3 }} />
      </div>

      {/* Swipe-up hint */}
      <div style={{
        position: 'absolute', bottom: 120, left: 0, right: 0,
        textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.42)',
        letterSpacing: '0.02em',
      }}>Swipe up or tap to close</div>
    </div>
  );
}
