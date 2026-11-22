import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BookOpen, Calculator, Check, ChevronRight, CircleHelp, Code2, Coffee, Flame, GraduationCap, Lightbulb, LockKeyhole, LogOut, Route, Trophy } from 'lucide-react';
import { type User } from '@supabase/supabase-js';
import { Auth } from './auth';
import { appName, client, loadRecords, saveAction, sectionName, teacherEmail, type EventRow, type Profile } from './client';
import { currentActivity, futureTopics, lessonFor, lessonReady, lessons, modules, summarize, type Action, type Lesson } from './data';
import { LessonPage } from './lesson';
import { Teacher } from './teacher';
import './style.css';

const moduleIcons = [Coffee, Calculator, Code2, Route];
const badges = ['Step Master', 'Hisab Hero', 'First Coder'];
const getRoute = () => location.hash.slice(1);
const navigate = (route = '') => { location.hash = route; window.scrollTo(0, 0); };

function Header({ teacher, account, demo, signOut }: { teacher: boolean; account: boolean; demo: boolean; signOut: () => void }) {
  return <header className="site-header"><div className="container header-inner">
    <a href="#" className="brand" aria-label="PFnest home"><span className="brand-icon"><BookOpen size={21} strokeWidth={2.25} /></span>PFnest</a>
    {!teacher && <nav aria-label="Main"><a href="#" className="nav-path">Learning path</a><a href="#progress">My progress</a></nav>}
    <div className="header-actions">
      {account || demo ? <button type="button" className="button secondary sign-out" onClick={signOut}><LogOut size={17} aria-hidden="true" /><span>{demo ? 'Exit practice' : 'Sign out'}</span></button>
        : <><a href="#teacher-signin" className="teacher-link" aria-label="Teacher sign in" title="Teacher sign in"><GraduationCap size={19} /><span>Teacher</span></a><a href="#signin" className="button secondary">Sign in</a></>}
    </div>
  </div></header>;
}

function CourseProgress({ rows }: { rows: EventRow[] }) {
  const summary = summarize(rows);
  return <div className="course-strip"><div className="container strip-inner"><strong>Course progress</strong>
    <progress value={summary.completed.length} max={lessons.length} aria-label="Course progress" />
    <span>{summary.percent}%</span></div></div>;
}

function ModulePath({ rows, open }: { rows: EventRow[]; open: (lesson: Lesson) => void }) {
  const upcoming = lessons.find(lesson => !currentActivity(rows, lesson).done);
  const [expanded, setExpanded] = useState<number | null>(upcoming?.module ?? null);

  return <div className="module-list">{modules.map((module, index) => {
    const Icon = moduleIcons[index];
    const content = lessons.filter(lesson => lesson.module === module.id);
    const count = content.filter(lesson => currentActivity(rows, lesson).done).length;
    const locked = module.id === 4 || Boolean(content[0] && !lessonReady(content[0], rows));
    const done = count > 0 && count === content.length;
    const showing = expanded === module.id;
    const status = module.id === 4 ? 'Coming soon' : done ? 'Complete' : locked ? 'Locked' : `${count} / ${content.length} complete`;
    return <section className={`module ${showing ? 'expanded' : ''}`} key={module.id}>
      <button className="module-heading" type="button" aria-expanded={showing} aria-controls={showing ? `module-${module.id}` : undefined} onClick={() => setExpanded(showing ? null : module.id)}>
        <span className={`icon-tile module-icon module-${module.id}`}><Icon size={23} aria-hidden="true" /></span>
        <span className="module-text"><span className="eyebrow">Module {module.id}</span><strong>{module.name}</strong><span className="muted">{module.title}</span></span>
        <span className={`module-status ${!locked ? 'available' : ''}`}>{locked ? <LockKeyhole size={14} /> : done ? <Check size={15} /> : null}{status}</span>
        <ChevronRight className="module-chevron" size={18} aria-hidden="true" />
      </button>
      {showing && <div className="module-content" id={`module-${module.id}`}>
        {module.id === 4 ? <><p className="muted">{upcoming ? module.detail : 'Coming soon.'}</p>{!upcoming && <ul className="future-list">{futureTopics.map(topic => <li key={topic}><LockKeyhole size={15} /> {topic}</li>)}</ul>}</>
          : locked ? <p className="muted">Finish Module {module.id - 1} to unlock these lessons.</p>
            : <ol className="lesson-list">{content.map((lesson, position) => {
              const ready = lessonReady(lesson, rows); const complete = currentActivity(rows, lesson).done;
              return <li key={lesson.id}><button className={lesson.id === upcoming?.id ? 'current' : ''} type="button" disabled={!ready} onClick={() => open(lesson)}>
                <span className="lesson-index">{complete ? <Check size={16} /> : position + 1}</span><span>{lesson.title}</span>{ready ? <ArrowRight size={17} /> : <LockKeyhole size={15} aria-label="Locked" />}
              </button></li>;
            })}</ol>}
      </div>}
    </section>;
  })}</div>;
}

function Overview({ rows, profile, demo, open }: { rows: EventRow[]; profile?: Profile; demo: boolean; open: (lesson: Lesson) => void }) {
  const summary = summarize(rows);
  const upcoming = lessons.find(lesson => !currentActivity(rows, lesson).done);
  return <main className="container home-main" id="main">
    <section className="home-hero">
      <div><span className="eyebrow"><GraduationCap size={18} /> Programming Fundamentals · USKT</span>
        <h1>{appName}</h1><p>Pehle problem dekho. Phir apna tareeqa banao.</p>
        {upcoming ? <button type="button" className="button primary" onClick={() => open(upcoming)}>{demo || profile ? summary.completed.length ? 'Continue learning' : 'Start first lesson' : 'Try the first problem'} <ArrowRight size={18} /></button>
          : <a className="button primary" href="#progress">See my progress <ArrowRight size={18} /></a>}
        {!profile && !demo && <span className="hero-note">Start with a cup of chai.</span>}
      </div>
      <div className="hero-steps" aria-label="How the lessons work">
        <div><span className="stage-icon"><Coffee size={21} /></span><strong>Try a problem</strong></div>
        <div><span className="stage-icon"><Route size={21} /></span><strong>Put steps in order</strong></div>
        <div><span className="stage-icon"><Check size={22} /></span><strong>Map your steps</strong></div>
      </div>
    </section>
    <div className="home-grid"><section className="path-section"><h2>Learning path</h2><ModulePath rows={rows} open={open} /></section>
      <aside className="sidebar" aria-label="Study information"><section className="side-card"><div className="side-title"><Trophy size={20} /><h2>Your progress</h2></div>
        <dl className="side-stats"><div><dt>Points</dt><dd>{summary.total}</dd></div><div><dt>Day streak</dt><dd>{summary.streak}</dd></div></dl>
        <a className="text-button" href="#progress">See my progress <ArrowRight size={16} /></a></section>
        <section className="side-card"><div className="side-title"><Lightbulb size={20} /><h2>Need a hint?</h2></div><p className="muted">Pehle khud try karo. Phir chhota hint lo aur dobara check karo.</p></section>
        {!profile && !demo && <section className="side-card"><div className="side-title"><CircleHelp size={20} /><h2>Save your work</h2></div><p className="muted">Sign in with your roll number and section to save your score.</p><a className="text-button" href="#signin">Student sign in <ArrowRight size={16} /></a></section>}
      </aside></div>
  </main>;
}

function Progress({ rows, profile }: { rows: EventRow[]; profile?: Profile }) {
  const summary = summarize(rows);
  const [board, setBoard] = useState<{ display_name: string; points: number }[]>();
  const [boardError, setBoardError] = useState(false);
  const section = profile?.pfn_section;
  useEffect(() => {
    if (!client || !section) return;
    let active = true;
    client.from('pfn_settings').select('leaderboard_visible').single().then(async ({ data, error }) => {
      if (!active) return;
      if (error) { setBoardError(true); return; }
      if (!data.leaderboard_visible) return;
      const { data: scores, error: failure } = await client!.rpc('pfn_leaderboard');
      if (active) { if (failure) setBoardError(true); else setBoard(scores); }
    });
    return () => { active = false; };
  }, [section]);
  return <main className="container progress-main" id="main">
    <header className="page-heading"><h1>My progress</h1><p className="muted">{profile ? `${profile.display_name} · ${sectionName(profile.pfn_section ?? '')}` : 'Practice session'}</p></header>
    <div className="stat-grid"><div><Trophy size={24} /><strong>{summary.total}</strong><span>Total points</span></div><div><Check size={24} /><strong>{summary.completed.length}/{lessons.length}</strong><span>Lessons complete</span></div><div><Flame size={24} /><strong>{summary.streak}</strong><span>Day streak</span></div></div>
    <section className="teacher-section"><h2>Module scores</h2><ul className="module-scores">{modules.slice(0, 3).map((module, index) => <li key={module.id}><span>{module.name}</span><strong>{summary.scores[index]} points</strong></li>)}</ul></section>
    <section className="teacher-section"><h2>Badges</h2><ul className="badges">{badges.map(badge => <li key={badge} className={summary.badges.includes(badge) ? 'earned' : ''}>
      {summary.badges.includes(badge) ? <Trophy size={18} /> : <LockKeyhole size={17} />}{badge}<span>{summary.badges.includes(badge) ? 'Earned' : 'Locked'}</span></li>)}</ul></section>
    {board && <section className="teacher-section"><h2>{sectionName(section ?? '')} leaderboard</h2>{board.length ? <ol className="leaderboard">{board.map((student, index) => <li key={`${student.display_name}-${index}`}>{student.display_name}<strong>{student.points} points</strong></li>)}</ol> : <p className="muted">Scores will appear after the first activity.</p>}</section>}
    {boardError && <p className="notice error" role="status">The class leaderboard could not load.</p>}
  </main>;
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const [user, setUser] = useState<User | null | undefined>(client ? undefined : null);
  const [loaded, setLoaded] = useState<{ id: string; profile: Profile; records: EventRow[] }>();
  const [failure, setFailure] = useState('');
  const [retry, setRetry] = useState(0);
  const [demo, setDemo] = useState(false);
  const [demoRows, setDemoRows] = useState<EventRow[]>([]);
  const userId = user?.id;

  useEffect(() => {
    const listener = () => setRoute(getRoute());
    window.addEventListener('hashchange', listener);
    const subscription = client?.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null)).data.subscription;
    return () => { window.removeEventListener('hashchange', listener); subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!client || !userId) return;
    let active = true;
    client.from('profiles').select('display_name,role,pfn_roll,pfn_section').eq('id', userId).single().then(async ({ data, error }) => {
      if (error || !data) throw new Error('Your profile could not load.');
      const records = data.pfn_roll ? await loadRecords(userId) : [];
      if (active) setLoaded({ id: userId, profile: data, records });
    }).then(undefined, () => { if (active) setFailure('Could not load your account. Check your connection and try again.'); });
    return () => { active = false; };
  }, [userId, retry]);

  const account = loaded?.id === userId ? loaded : undefined;
  const profile = account?.profile;
  const teacher = profile?.role === 'admin' && user?.email?.toLowerCase() === teacherEmail && user.app_metadata.pfn_teacher === true;
  const records = account?.records ?? demoRows;
  const lesson = route.startsWith('lesson/') ? lessonFor(route.slice(7)) : undefined;
  const isAuth = route === 'signin' || route === 'teacher-signin';
  const ready = !isAuth && lesson && (profile?.pfn_roll || demo) && lessonReady(lesson, records);

  async function act(action: Action) {
    const row = await saveAction(action, records, !account && demo);
    const append = (previous: EventRow[]) => previous.some(event => event.request_id === row.request_id) ? previous : [...previous, row];
    if (account) setLoaded(previous => previous?.id === account.id ? { ...previous, records: append(previous.records) } : previous);
    else setDemoRows(append);
    return row;
  }

  function open(item: Lesson) {
    if (!account) setDemo(true);
    navigate(`lesson/${item.id}`);
  }

  async function signOut() {
    if (user && client) {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) { setFailure('Could not sign out. Please try again.'); return; }
    }
    setLoaded(undefined); setDemo(false); setDemoRows([]); setFailure(''); navigate();
  }

  let screen;
  if (user === undefined || (user && !profile && !failure)) screen = <main className="container status-main" id="main"><p role="status">Loading your learning path…</p></main>;
  else if (user && failure && !profile) screen = <main className="container status-main" id="main"><p className="notice error" role="alert">{failure}</p><button className="button primary" type="button" onClick={() => { setFailure(''); setRetry(retry + 1); }}>Try again</button></main>;
  else if (teacher && profile) screen = <Teacher profile={profile} />;
  else if (user && profile && !profile.pfn_roll) screen = <main className="container status-main" id="main"><h1>Class account needed</h1><p>Sign out and create a student account with your roll number and section.</p></main>;
  else if (isAuth && !user) screen = <Auth key={route} initial={route === 'teacher-signin' ? 'teacher' : 'student'} close={() => navigate()} />;
  else if (route === 'progress') screen = <Progress rows={records} profile={profile} />;
  else if (ready && lesson) screen = <LessonPage key={`${userId ?? 'demo'}-${lesson.id}`} lesson={lesson} rows={records} onAction={act} onBack={() => navigate()}
    onNext={() => { const next = lessons[lessons.indexOf(lesson) + 1]; if (next) open(next); else navigate('progress'); }} />;
  else screen = <Overview rows={records} profile={profile} demo={demo} open={open} />;

  return <><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); const main = document.getElementById('main'); main?.setAttribute('tabindex', '-1'); main?.focus(); }}>Skip to content</a><div className="sticky-top"><Header teacher={Boolean(teacher)} account={Boolean(user)} demo={demo && !user} signOut={() => void signOut()} />
    {!teacher && !isAuth && <CourseProgress rows={records} />}</div>
    {demo && !user && !isAuth && <div className="demo-strip"><div className="container">Practice mode · Work stays in this session. <a href="#signin">Sign in to save your score.</a></div></div>}
    {failure && profile && <div className="container"><p className="notice error" role="alert">{failure}</p></div>}
    {screen}<footer className="container footer"><span>PFnest</span><span>Programming Fundamentals · USKT</span></footer></>;
}

createRoot(document.getElementById('root')!).render(<App />);
