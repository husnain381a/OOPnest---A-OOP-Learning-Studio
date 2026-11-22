import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { appName, client, sections, studentEmail, teacherEmail } from './client';

export function Auth({ initial, close }: { initial: 'student' | 'teacher'; close: () => void }) {
  const [mode, setMode] = useState<'student' | 'teacher' | 'signup'>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || busy) return;
    const form = new FormData(event.currentTarget);
    const roll = String(form.get('roll') ?? '').trim().toUpperCase();
    const section = String(form.get('section') ?? '');
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const email = mode === 'teacher' ? String(form.get('email')).trim().toLowerCase() : studentEmail(roll, section);
    if (mode !== 'teacher' && !/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(roll)) {
      setError('Use 2–32 letters, numbers or hyphens in your roll number.'); return;
    }
    if (mode === 'teacher' && email !== teacherEmail) { setError('Use the PF Lab teacher email.'); return; }
    if (mode === 'signup' && name.length < 2) { setError('Enter your name as it appears on the class list.'); return; }
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { data, error: failure } = await client.auth.signUp({ email, password, options: { data: { full_name: name, pfn_roll: roll, pfn_section: section } } });
        if (failure) throw failure;
        if (!data.session) { setError('Class signup is unavailable. Please tell your teacher.'); return; }
      } else {
        const { error: failure } = await client.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
      }
      close();
    } catch {
      setError(mode === 'signup' ? 'Could not make this account. Check your roll number or try signing in.' : 'Sign-in failed. Check your details and password.');
    } finally { setBusy(false); }
  }

  function change(next: typeof mode) { setMode(next); setError(''); }

  return <main className="auth-main" id="main">
    <button className="text-button" onClick={close}><ArrowLeft size={17} /> Back to learning path</button>
    <section className="auth-card">
      <span className="icon-tile" aria-hidden="true">{mode === 'teacher' ? <GraduationCap size={25} /> : <BookOpen size={23} />}</span>
      <h1>{mode === 'teacher' ? 'Teacher sign in' : mode === 'signup' ? 'Create your account' : 'Student sign in'}</h1>
      <p className="muted">{mode === 'teacher' ? 'PF Lab · USKT' : `Save your work in ${appName}.`}</p>
      {!client && <p className="notice" role="status">Class accounts are not connected yet. You can try a practice session from the learning path.</p>}
      <form onSubmit={submit} key={mode}>
        {mode === 'teacher' ? <label>Teacher email<input name="email" autoComplete="username" type="email" required /></label> : <>
          {mode === 'signup' && <label>Name<input name="name" autoComplete="name" maxLength={120} required /></label>}
          <label>Roll number<input name="roll" autoComplete="username" autoCapitalize="characters" maxLength={32} placeholder="e.g. BSCS-017" required /></label>
          <label>Section<select name="section" required defaultValue=""><option value="" disabled>Choose your section</option>{sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
        </>}
        <label>Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required /></label>
        {mode === 'signup' && <p className="small muted">Use at least 8 characters.</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="button primary" disabled={!client || busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={18} /></button>
      </form>
      <div className="auth-links">
        {mode !== 'teacher' && <button className="text-button" onClick={() => change(mode === 'signup' ? 'student' : 'signup')}>{mode === 'signup' ? 'I already have an account' : 'Create a student account'}</button>}
        <button className="text-button muted" onClick={() => change(mode === 'teacher' ? 'student' : 'teacher')}><UserRound size={16} /> {mode === 'teacher' ? 'Student sign in' : 'Teacher sign in'}</button>
      </div>
    </section>
  </main>;
}
