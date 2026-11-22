import { useEffect, useState } from 'react';
import { ChartNoAxesColumn, GraduationCap, RefreshCw, Users } from 'lucide-react';
import { client, sectionName, sections, type Profile } from './client';
import { lessons, stageLabels, type Stage } from './data';

type Student = { id: string; display_name: string; pfn_roll: string; pfn_section: string; score: number; module_scores: number[]; completed: number; last_active: string | null };
type Weakness = { section: string; topic: string; students: number; attempted: number };
type Overview = { students: Student[]; weaknesses: Weakness[] };
const titles: Record<string, string> = {
  'flow-decision': 'Flowchart · Decision', 'flow-start': 'Flowchart · Start', 'flow-end': 'Flowchart · End', 'flow-io': 'Flowchart · Input / Output',
  'flow-process': 'Flowchart · Process', 'flow-arrows': 'Flowchart · Arrows', 'code-format': 'C++ · Output line format', code: 'C++ · Match the output',
};
const labelFor = (topic: string) => titles[topic] ?? stageLabels[topic as Stage] ?? topic;

export function Teacher({ profile }: { profile: Profile }) {
  const [overview, setOverview] = useState<Overview>();
  const [visible, setVisible] = useState<boolean>();
  const [section, setSection] = useState('');
  const [request, setRequest] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    let active = true;
    Promise.all([client.rpc('pfn_teacher_overview'), client.from('pfn_settings').select('leaderboard_visible').single()]).then(([stats, settings]) => {
      if (!active) return;
      if (stats.error || settings.error) setError('Could not load the class. Check your connection and try again.');
      else { setOverview(stats.data as Overview); setVisible(settings.data.leaderboard_visible); }
      setBusy(false);
    }, () => { if (active) { setBusy(false); setError('Could not load the class. Please try again.'); } });
    return () => { active = false; };
  }, [request]);

  async function changeBoard() {
    if (!client || visible === undefined || saving) return;
    setSaving(true); setError('');
    try {
      const { data, error: failure } = await client.from('pfn_settings').update({ leaderboard_visible: !visible }).eq('id', true).select('leaderboard_visible').single();
      if (failure) throw failure;
      setVisible(data.leaderboard_visible);
    } catch { setError('Could not change the leaderboard. Try again.'); }
    finally { setSaving(false); }
  }

  const students = overview?.students.filter(student => !section || student.pfn_section === section) ?? [];
  const summaries = new Map<string, { students: number; attempted: number }>();
  for (const row of overview?.weaknesses ?? []) {
    if (section && row.section !== section) continue;
    const topic = summaries.get(row.topic) ?? { students: 0, attempted: 0 };
    topic.students += row.students;
    topic.attempted += row.attempted;
    summaries.set(row.topic, topic);
  }
  const weaknesses = [...summaries].map(([topic, row]) => ({ topic, ...row, percent: Math.round(row.students / row.attempted * 100) }))
    .filter(row => row.attempted > 0 && row.students > 0).sort((a, b) => b.percent - a.percent || b.students - a.students);

  return <main className="container teacher-main" id="main">
    <header className="page-heading"><span className="eyebrow"><GraduationCap size={17} /> USKT · PF Lab</span><h1>Teacher dashboard</h1><p className="muted">{profile.display_name} · Lab Demonstrator</p></header>
    <div className="teacher-controls">
      <label>Section<select value={section} onChange={event => setSection(event.target.value)}><option value="">All sections</option>{sections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className="button secondary" disabled={busy} onClick={() => { setBusy(true); setError(''); setRequest(request + 1); }}><RefreshCw size={17} /> Refresh</button>
    </div>
    {busy && <p role="status" className="notice">Loading the class…</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <section className="teacher-section"><div className="teacher-title"><Users size={21} /><h2>Students</h2></div>
      {overview && (students.length ? <div className="student-list">{students.map(student => <article key={student.id} className="student-card">
        <div className="student-meta"><div><h3>{student.display_name}</h3><p className="small muted">{student.pfn_roll} · {sectionName(student.pfn_section)}</p></div><strong>{student.score} points</strong></div>
        <label className="small">{student.completed} of {lessons.length} lessons<progress aria-label={`${student.display_name} progress`} value={student.completed} max={lessons.length} /></label>
        <div className="student-scores small"><span>Socho <b>{student.module_scores[0]}</b></span><span>Hisab <b>{student.module_scores[1]}</b></span><span>Pehla Code <b>{student.module_scores[2]}</b></span></div>
      </article>)}</div> : <p className="muted">No students have signed up in this section yet.</p>)}
    </section>
    <section className="teacher-section"><div className="teacher-title"><ChartNoAxesColumn size={21} /><h2>Topics that need practice</h2></div>
      <p className="muted">Share of students who made at least one mistake, among students who tried the activity.</p>
      {overview && (weaknesses.length ? <ul className="topic-list">{weaknesses.map(item => <li key={item.topic}><div><strong>{labelFor(item.topic)}</strong><span>{item.percent}%</span></div>
        <progress max={100} value={item.percent} aria-label={labelFor(item.topic)} /><p className="small muted">{item.students} of {item.attempted} students</p></li>)}</ul> : <p className="muted">No mistakes have been recorded for this section yet.</p>)}
    </section>
    <section className="teacher-section inline-setting"><div><h2>Class leaderboard</h2><p className="muted">Show the top 10 scores in each section.</p></div>
      <button className="button secondary" type="button" role="switch" aria-label="Show class leaderboard" aria-checked={Boolean(visible)} disabled={saving || visible === undefined} onClick={() => void changeBoard()}>{visible ? 'Visible' : 'Hidden'}</button>
    </section>
  </main>;
}
