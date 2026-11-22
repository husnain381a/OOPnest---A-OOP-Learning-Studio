import { useEffect, useState } from 'react';
import { ArrowDown, ChevronLeft, ChevronRight, CircleHelp, GraduationCap, Target, Users } from 'lucide-react';
import { curriculum, maximumScore, stagesFor } from '../lib/content';
import { supabase } from '../lib/supabase';

type Student = {
  id: string;
  display_name: string;
  completed: number;
  points: number;
  lessons: { id: string; points: number }[];
};

type Topic = {
  lesson_id: string;
  learners_started: number;
  learners_finished: number;
  first_checks: number;
  first_correct: number;
};

type Report = { total: number; active: number; students: Student[]; topics: Topic[] };
const pageSize = 24;
const titles = new Map(curriculum.map(({ module, lesson }) => [lesson.id, {
  title: lesson.title, module: module.title, points: stagesFor(lesson).length,
}]));

function accuracy(topic: Topic) {
  return topic.first_correct / topic.first_checks;
}

function StudentDetails({ student }: { student: Student }) {
  return <details className="student-row">
    <summary>
      <span className="student-name"><span className="avatar">{student.display_name.trim()[0]?.toUpperCase() || 'S'}</span>{student.display_name}</span>
      <span>{student.completed} / {curriculum.length} <small>lessons</small></span>
      <span>{student.points} / {maximumScore} <small>points</small></span>
      <ChevronRight size={17} aria-hidden="true" />
    </summary>
    <ul className="student-lessons">{student.lessons.map(item => {
      const lesson = titles.get(item.id);
      return lesson && <li key={item.id}><span>{lesson.title}</span><span>{item.points} / {lesson.points} points</span></li>;
    })}</ul>
  </details>;
}

export function StudentDirectory({ name }: { name: string }) {
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Report>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const request = new AbortController();
    async function load() {
      try {
        const { data, error } = await client!.rpc('pf_class_report', {
          page_size: pageSize, page_start: page * pageSize,
        }).abortSignal(request.signal);
        if (request.signal.aborted) return;
        if (error || !data) throw new Error('Class report unavailable');
        setResult(data as Report);
      } catch {
        if (!request.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => request.abort();
  }, [page, reload]);

  function loadPage(next: number) {
    setResult(undefined);
    setFailed(false);
    setPage(next);
    setReload(value => value + 1);
  }

  const attempted = result?.topics.filter(topic => topic.first_checks > 0).sort((a, b) =>
    accuracy(a) - accuracy(b) || b.first_checks - a.first_checks) ?? [];
  const lowest = attempted[0];
  return <div className="teacher-page">
    <header className="view-heading">
      <p className="eyebrow"><GraduationCap size={17} aria-hidden="true" /> Lab Demonstrator · USKT</p>
      <h1>Class progress</h1>
      <p>Welcome, {name}. See how students are doing and where the class needs another example.</p>
    </header>
    {failed && <div className="side-card" role="alert">
      <p>Class progress could not load. Check your connection and try again.</p>
      <button className="button outline" onClick={() => loadPage(page)}>Try again</button>
    </div>}
    {!result && !failed && <p className="side-card" role="status">Loading class progress…</p>}
    {result && <>
      <div className="class-metrics">
        <div className="side-card"><Users size={21} aria-hidden="true" /><span>Students</span><strong>{result.total}</strong></div>
        <div className="side-card"><Target size={21} aria-hidden="true" /><span>Started a lesson</span><strong>{result.active}</strong></div>
        <div className="side-card"><CircleHelp size={21} aria-hidden="true" /><span>Lowest first-try accuracy</span>
          <strong className="topic-metric">{lowest ? titles.get(lowest.lesson_id)?.title : 'Waiting for attempts'}</strong>
        </div>
      </div>
      <section className="report-section" aria-labelledby="topic-report">
        <div className="section-heading"><div>
          <h2 id="topic-report">Topics to revisit</h2>
          <p>Sorted by first-try accuracy. Retries help students learn and earn the same points.</p>
        </div><ArrowDown size={20} aria-hidden="true" /></div>
        {attempted.length ? <ul className="topic-report">{attempted.map(topic => {
          const name = titles.get(topic.lesson_id);
          const percent = Math.round(accuracy(topic) * 100);
          return <li key={topic.lesson_id}>
            <div><strong>{name?.title}</strong><span>{name?.module} · {topic.learners_finished} of {topic.learners_started} finished</span></div>
            <div className="topic-score"><progress max={100} value={percent} aria-label={`${name?.title} first-try accuracy`} />
              <span>{percent}% <small>({topic.first_correct}/{topic.first_checks} checks)</small></span></div>
          </li>;
        })}</ul> : <p className="empty-report">First attempts will appear here once students check their work.</p>}
      </section>
      <section className="report-section" aria-labelledby="student-report">
        <div className="section-heading"><div>
          <h2 id="student-report">Student scores</h2>
          <p>Open a student to see their progress in each lesson.</p>
        </div></div>
        {result.students.length ? result.students.map(student => <StudentDetails student={student} key={student.id} />)
          : <p className="empty-report">Students will appear here when they create an account.</p>}
        {result.total > pageSize && <div className="pagination">
          <button className="button outline" disabled={page === 0} onClick={() => loadPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /> Previous</button>
          <span>Page {page + 1} of {Math.ceil(result.total / pageSize)}</span>
          <button className="button outline" disabled={(page + 1) * pageSize >= result.total} onClick={() => loadPage(page + 1)}>Next <ChevronRight size={16} aria-hidden="true" /></button>
        </div>}
      </section>
    </>}
  </div>;
}
