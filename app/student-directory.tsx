import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { lessons } from '../lib/content';
import { supabase } from '../lib/supabase';

type Student = { id: string; display_name: string; created_at: string; completed: number };
const pageSize = 30;

export function StudentDirectory() {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ students: Student[]; count: number }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const request = new AbortController();

    async function loadStudents() {
      try {
        const start = page * pageSize;
        const profiles = await client.from('profiles')
          .select('id,display_name,created_at', { count: 'exact' })
          .eq('role', 'student')
          .order('created_at', { ascending: false })
          .order('id')
          .range(start, start + pageSize - 1)
          .abortSignal(request.signal);
        if (profiles.error) throw profiles.error;
        if (!profiles.data.length) {
          if (!request.signal.aborted) setResult({ students: [], count: profiles.count ?? 0 });
          return;
        }

        const progress = await client.from('lesson_progress')
          .select('user_id')
          .in('user_id', profiles.data.map(student => student.id))
          .abortSignal(request.signal);
        if (progress.error) throw progress.error;

        const counts = new Map<string, number>();
        for (const { user_id } of progress.data) counts.set(user_id, (counts.get(user_id) ?? 0) + 1);
        if (!request.signal.aborted) setResult({
          students: profiles.data.map(student => ({ ...student, completed: counts.get(student.id) ?? 0 })),
          count: profiles.count ?? 0,
        });
      } catch {
        if (!request.signal.aborted) setFailed(true);
      }
    }

    void loadStudents();
    return () => request.abort();
  }, [page, attempt]);

  function changePage(next: number) {
    setResult(undefined);
    setPage(next);
  }

  return <>
    <div className="path-summary">
      <GraduationCap size={30}/>
      <div>
        <h3>{result ? `${result.count} registered ${result.count === 1 ? 'student' : 'students'}` : 'Student directory'}</h3>
        <p>Account-backed progress across all eight foundation lessons.</p>
      </div>
    </div>
    {failed ? <div role="status" className="notes-banner">
      <p>Could not load the student directory.</p>
      <button className="text-button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Try again</button>
    </div> : !result ? <p role="status">Loading student directory…</p> : <>
      <div className="admin-table">
        {result.students.length ? <table>
          <thead><tr><th>Student</th><th>Joined</th><th>Lessons complete</th><th>Progress</th></tr></thead>
          <tbody>{result.students.map(student => <tr key={student.id}>
            <td>{student.display_name || 'Learner'}</td>
            <td>{new Date(student.created_at).toLocaleDateString()}</td>
            <td>{student.completed} / {lessons.length}</td>
            <td>{Math.round(student.completed / lessons.length * 100)}%</td>
          </tr>)}</tbody>
        </table> : <p>{page ? 'There are no students on this page.' : 'No students registered yet.'}</p>}
      </div>
      {(page > 0 || result.count > pageSize) && <div className="filter-group" aria-label="Student directory pages">
        <button disabled={page === 0} onClick={() => changePage(page - 1)}>Previous page</button>
        <span>Page {page + 1}</span>
        <button disabled={(page + 1) * pageSize >= result.count} onClick={() => changePage(page + 1)}>Next page</button>
      </div>}
    </>}
  </>;
}
