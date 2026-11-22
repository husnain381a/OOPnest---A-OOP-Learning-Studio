'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, ChartNoAxesColumn, Check, ChevronRight, CircleHelp, ClipboardCheck,
  Code2, Coffee, GitBranch, GraduationCap, House, Lightbulb, LockKeyhole, LogIn, LogOut,
  Repeat2, Route, Sparkle, Target,
} from 'lucide-react';
import { curriculum, maximumScore, modules, stagesFor } from '../lib/content';
import { supabase } from '../lib/supabase';
import { blankRecord, completedCount, firstUnfinished, pointCount, useWorkspace, type Progress } from '../lib/use-workspace';
import { AuthScreen } from './auth-screen';
import { Brand } from './brand';
import { LessonView } from './lesson-view';
import { StudentDirectory } from './student-directory';

const navigation = [
  { id: 'home', label: 'Overview', icon: House },
  { id: 'path', label: 'Learning path', icon: BookOpen },
  { id: 'progress', label: 'My progress', icon: ChartNoAxesColumn },
] as const;

const moduleIcons = [Lightbulb, GitBranch, Code2, GitBranch, Repeat2] as const;

function BookArtwork() {
  return <div className="book-art" aria-hidden="true">
    <div className="art-orbit" />
    <Sparkle className="sparkle art-sparkle-large" size={26} />
    <Sparkle className="sparkle art-sparkle-small" size={16} />
    <div className="art-tile art-coffee"><Coffee size={27} /></div>
    <div className="notebook">
      <span className="book-rings"><i /><i /><i /><i /></span>
      <span className="book-rule" />
      <div className="book-steps">
        {[1, 2, 3].map(index => <div key={index}><b>{index}</b><span /><span /></div>)}
      </div>
      <span className="book-fold" />
    </div>
    <div className="art-tile art-check"><Check size={25} /></div>
    <div className="art-pencil"><i /></div>
  </div>;
}

function ProgressMeter({ progress, link = true }: { progress: Progress; link?: boolean }) {
  const completed = completedCount(progress);
  const percentage = Math.round(completed / curriculum.length * 100);
  return <section className="side-card progress-card">
    <div className="side-title"><span className="small-icon mint"><Target size={19} aria-hidden="true" /></span><h2>Your progress</h2></div>
    <p className="progress-number">{percentage}<span>%</span></p>
    <progress max={curriculum.length} value={completed} aria-label="Lessons completed" />
    <p className="muted">{completed} of {curriculum.length} lessons complete</p>
    <div className="score-line"><span>Points earned</span><strong>{pointCount(progress)} / {maximumScore}</strong></div>
    {link && <a className="button quiet progress-link" href="#progress">See my progress <ArrowRight size={16} aria-hidden="true" /></a>}
  </section>;
}

function ModuleList({ progress, selected, detail = false }: { progress: Progress; selected?: string; detail?: boolean }) {
  const unlocked = firstUnfinished(progress);
  return <div className="module-list">{modules.map((module, index) => {
    if (selected && module.id !== selected) return null;
    const Icon = moduleIcons[index];
    const start = curriculum.findIndex(item => item.module.id === module.id);
    const lessonComplete = (offset: number) => {
      const lesson = module.lessons[offset];
      return (progress[lesson.id]?.step ?? 0) >= stagesFor(lesson).length;
    };
    const completed = module.lessons.filter((_, offset) => lessonComplete(offset)).length;
    const locked = unlocked >= 0 && start > unlocked;
    const done = completed === module.lessons.length;
    const status = locked ? 'Locked' : done ? 'Complete' : 'Available';
    const content = <>
      <span className={`module-icon ${module.tone}`}><Icon size={24} aria-hidden="true" /></span>
      <span className="module-text">
        <span>Module {String(index + 1).padStart(2, '0')} · {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
        <strong>{module.title}</strong>
        <small>{module.description}</small>
      </span>
      <span className={`module-status ${status.toLowerCase()}`}>{status}</span>
      {locked ? <LockKeyhole size={17} className="module-end" aria-hidden="true" />
        : done ? <Check size={18} className="module-end" aria-hidden="true" />
        : !detail && <ChevronRight size={18} className="module-end" aria-hidden="true" />}
    </>;
    return <article className={`module-card ${locked ? 'module-locked' : ''}`} key={module.id}>
      {!detail && !locked ? <a className="module-top" href={`#path/${module.id}`}>{content}</a>
        : <div className="module-top">{content}</div>}
      {detail && <ul className="module-lessons">
        {module.lessons.map((lesson, offset) => {
          const available = unlocked < 0 || start + offset <= unlocked;
          const complete = lessonComplete(offset);
          const statusText = complete ? 'Review' : (progress[lesson.id]?.revision ?? 0) > 0 ? 'Resume' : 'Start';
          return <li key={lesson.id}>
            {available ? <a href={`#lesson/${lesson.id}`}><span>{lesson.title}</span><span>{statusText}<ChevronRight size={15} aria-hidden="true" /></span></a>
              : <div><span>{lesson.title}</span><span>Locked <LockKeyhole size={14} aria-hidden="true" /></span></div>}
          </li>;
        })}
      </ul>}
    </article>;
  })}</div>;
}

function Dashboard({ progress }: { progress: Progress }) {
  const index = firstUnfinished(progress);
  const current = curriculum[index];
  const resumed = current && Boolean(progress[current.lesson.id]?.revision);
  return <>
    <header className="view-heading dashboard-heading">
      <h1>Learning overview</h1>
      <p>Programming Fundamentals for first-semester students.</p>
    </header>
    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <p className="hero-label"><span /> {current ? `YOUR NEXT LESSON · ${String(index + 1).padStart(2, '0')}` : 'LEARNING PATH COMPLETE'}</p>
        <h2 id="welcome-title">{current ? current.lesson.title : 'You finished the learning path'}</h2>
        <p>{current ? current.lesson.story : 'Revisit a problem, review how you solved it, or try a new input.'}</p>
        <div className="hero-actions">
          <a className="button primary" href={current ? `#lesson/${current.lesson.id}` : '#progress'}>
            {current ? resumed ? 'Resume lesson' : 'Start lesson' : 'See my progress'} <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="button quiet" href="#path">View learning path</a>
        </div>
      </div>
      <BookArtwork />
    </section>
    <div className="overview-grid">
      <section aria-labelledby="overview-path">
        <header className="section-heading">
          <div><h2 id="overview-path">Learning path</h2><p>Start with everyday problems. Build up to C++.</p></div>
        </header>
        <ModuleList progress={progress} />
      </section>
      <div className="overview-aside">
        <ProgressMeter progress={progress} />
        <section className="side-card learning-tip">
          <div className="side-title"><span className="small-icon butter"><Lightbulb size={19} aria-hidden="true" /></span><h2>Hints are part of practice</h2></div>
          <p>If you get stuck, use the hint and try again. You can still earn the full points.</p>
        </section>
      </div>
    </div>
  </>;
}

function LearningPath({ progress, selected }: { progress: Progress; selected?: string }) {
  const module = modules.find(item => item.id === selected);
  return <div className="path-page">
    {module && <a className="button quiet back-button" href="#path"><ArrowLeft size={17} aria-hidden="true" /> All modules</a>}
    <header className="view-heading">
      <p className="eyebrow"><Route size={17} aria-hidden="true" /> Learning path</p>
      <h1>{module ? module.title : 'Your learning path'}</h1>
      <p>{module ? module.description : 'Finish each lesson to open the next. The first two modules use everyday problems before any code.'}</p>
    </header>
    <ModuleList progress={progress} selected={module?.id} detail />
  </div>;
}

function MyProgress({ progress, signedIn }: { progress: Progress; signedIn: boolean }) {
  return <>
    <header className="view-heading">
      <p className="eyebrow"><ClipboardCheck size={17} aria-hidden="true" /> Your work</p>
      <h1>My progress</h1>
      <p>Earn one point each time you finish a checkpoint. You keep the same points after a retry.</p>
    </header>
    {!signedIn && <p className="device-note"><CircleHelp size={18} aria-hidden="true" /> Guest practice stays in this browser. <a href="#signin">Sign in</a> to share classwork with your teacher.</p>}
    <div className="overview-grid">
      <section className="report-section" aria-labelledby="lesson-progress">
        <div className="section-heading"><h2 id="lesson-progress">Lesson scores</h2></div>
        <ul className="topic-report">
          {curriculum.map(({ lesson }) => {
            const earned = progress[lesson.id]?.step ?? 0;
            const total = stagesFor(lesson).length;
            return <li key={lesson.id}>
              <div><strong>{lesson.title}</strong><span>{earned === total ? 'Complete' : progress[lesson.id] ? 'In progress' : 'Not started'}</span></div>
              <div className="topic-score"><progress max={total} value={earned} aria-label={`${lesson.title} points`} /><span>{earned} / {total} points</span></div>
            </li>;
          })}
        </ul>
      </section>
      <div className="overview-aside"><ProgressMeter progress={progress} link={false} /></div>
    </div>
  </>;
}

function getRoute() {
  return window.location.hash.slice(1) || 'home';
}

function go(destination: string) {
  window.location.hash = destination;
}

export default function Home() {
  const workspace = useWorkspace();
  const [route, setRoute] = useState('home');
  const [signingOut, setSigningOut] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const main = useRef<HTMLElement>(null);
  const signInReturn = useRef('home');
  const [view, id] = route.split('/');
  const { user, isAdmin, status, progress } = workspace;

  useEffect(() => {
    setRoute(getRoute());
    function onNavigate() {
      setRoute(getRoute());
      setSessionError('');
      window.scrollTo(0, 0);
      requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
    }
    window.addEventListener('hashchange', onNavigate);
    return () => window.removeEventListener('hashchange', onNavigate);
  }, []);

  useEffect(() => {
    if (user && route === 'signin') go(signInReturn.current);
  }, [user, route]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSessionError('');
    try {
      const result = await supabase?.auth.signOut({ scope: 'local' });
      if (result?.error) throw result.error;
      go('home');
    } catch {
      setSessionError('Could not sign out. Try again before leaving this device.');
    } finally {
      setSigningOut(false);
    }
  }

  function signIn() {
    if (view === 'signin') return;
    signInReturn.current = route;
    go('signin');
  }

  const isActive = (item: string) => item === view || (item === 'path' && view === 'lesson');

  function renderView() {
    if (status === 'loading' && (user || view !== 'home')) return <p className="side-card" role="status">Opening your workspace…</p>;
    if (status === 'error') return <div className="side-card" role="alert">
      <h1>We could not open your account</h1><p>Check your connection and try again.</p>
      <button className="button outline" onClick={workspace.retry}>Try again</button>
    </div>;
    if (view === 'signin') return <AuthScreen key="student" teacher={false} back={() => go(signInReturn.current)} />;
    if (view === 'teacher') {
      if (!user) return <AuthScreen key="teacher" teacher back={() => go('home')} />;
      return isAdmin ? <StudentDirectory name={workspace.name ?? 'Aimen'} /> : <div className="side-card">
        <h1>Teacher view</h1><p>Sign in with a teacher account to see class progress.</p>
        <button className="button outline" disabled={signingOut} onClick={signOut}>Sign out</button>
      </div>;
    }
    if (view === 'path') return <LearningPath progress={progress} selected={id} />;
    if (view === 'progress') return <MyProgress progress={progress} signedIn={Boolean(user)} />;
    if (view === 'lesson') {
      const index = curriculum.findIndex(item => item.lesson.id === id);
      const current = curriculum[index];
      const allowed = firstUnfinished(progress);
      if (!current || (allowed >= 0 && index > allowed)) return <section className="side-card">
        <h1>{current ? 'This lesson is locked' : 'Lesson unavailable'}</h1>
        <p>{current ? 'Finish the previous lessons to open it.' : 'Pick a lesson from the learning path.'}</p>
        <a className="button primary" href={current && allowed >= 0 ? `#lesson/${curriculum[allowed].lesson.id}` : '#path'}>
          {current ? 'Go to my next lesson' : 'View learning path'} <ArrowRight size={17} aria-hidden="true" />
        </a>
      </section>;
      const next = curriculum[index + 1];
      return <LessonView key={`${user?.id ?? 'guest'}:${id}`} lesson={current.lesson} number={index + 1}
        mood={current.module.tone} record={progress[current.lesson.id] ?? blankRecord} signedIn={Boolean(user)}
        save={workspace.save} next={next ? () => go(`lesson/${next.lesson.id}`) : undefined}
        back={() => go(`path/${current.module.id}`)} signIn={signIn} />;
    }
    return <Dashboard progress={progress} />;
  }

  return <div className="shell">
    <a className="skip-link" href="#main-content" onClick={event => {
      event.preventDefault();
      main.current?.focus();
    }}>Skip to main content</a>
    <aside className="sidebar" aria-label="Workspace">
      <Brand />
      <nav className="desktop-navigation" aria-label="Student navigation">
        <p className="nav-label">WORKSPACE</p>
        {navigation.map(item => <a key={item.id} href={`#${item.id}`} aria-current={isActive(item.id) ? 'page' : undefined}>
          <item.icon size={19} aria-hidden="true" /> {item.label}
        </a>)}
      </nav>
      <div className="sidebar-bottom">
        <a className="teacher-link" href="#teacher" aria-current={isActive('teacher') ? 'page' : undefined}>
          <span className="small-icon peach"><GraduationCap size={19} aria-hidden="true" /></span>
          <span><strong>Teacher view</strong><small>Class progress</small></span>
          <ChevronRight size={16} aria-hidden="true" />
        </a>
      </div>
    </aside>
    <div className="shell-body">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="topbar-label"><BookOpen size={17} aria-hidden="true" /> {view === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</span>
          <div className="mobile-brand"><Brand /></div>
          <div className="account-tools">
            {user ? <>
              <span className="account-name" title={workspace.name}>{workspace.name}</span>
              <button type="button" className="button outline session-button" disabled={signingOut} onClick={signOut}><LogOut size={16} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}</button>
            </> : <>
              <span className="guest-label"><span /> Guest practice</span>
              <button type="button" className="button outline session-button" onClick={signIn}><LogIn size={16} aria-hidden="true" /> Sign in</button>
            </>}
          </div>
        </div>
        <nav className="mobile-navigation" aria-label="Main navigation">
          {navigation.map(item => <a key={item.id} href={`#${item.id}`} aria-current={isActive(item.id) ? 'page' : undefined}>
            <item.icon size={17} aria-hidden="true" /> {item.label}
          </a>)}
          <a href="#teacher" aria-current={isActive('teacher') ? 'page' : undefined}><GraduationCap size={17} aria-hidden="true" /> Teacher</a>
        </nav>
      </header>
      <main className="main-content" id="main-content" ref={main} tabIndex={-1}>
        {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
        {!user && !workspace.guestStorage && <p className="device-note" role="status">Guest progress stays in this tab until it closes.</p>}
        {renderView()}
      </main>
    </div>
  </div>;
}
