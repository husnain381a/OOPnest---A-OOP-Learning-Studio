import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthScreen({ teacher, back }: { teacher: boolean; back: () => void }) {
  const [signingUp, setSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    setProblem('');
    try {
      const credentials = {
        email: String(fields.get('email')).trim(),
        password: String(fields.get('password')),
      };
      const name = String(fields.get('full-name') ?? '').trim();
      if (signingUp && name.length < 2) {
        setProblem('Enter the name Aimen uses in class.');
        return;
      }
      const result = signingUp
        ? await supabase.auth.signUp({ ...credentials, options: { data: { full_name: name } } })
        : await supabase.auth.signInWithPassword(credentials);

      if (result.error) {
        const code = result.error.code;
        setProblem(code === 'invalid_credentials' ? 'Check your email and password and try again.'
          : code === 'email_not_confirmed' ? 'Open the confirmation link in your email, then sign in.'
          : code === 'user_already_exists' ? 'An account already uses this email. Try signing in.'
          : code === 'weak_password' ? 'Choose a stronger password and try again.'
          : 'Account access is unavailable right now. Try again in a moment.');
      } else if (signingUp && !result.data.session) {
        setMessage('Check your email for a confirmation link. Then come back to sign in.');
      }
    } catch {
      setProblem('We could not connect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  const Icon = teacher ? GraduationCap : UserRound;
  return <div className="auth-wrap">
    <button type="button" className="button quiet back-button" onClick={back}><ArrowLeft size={17} aria-hidden="true" /> Back to learning</button>
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={pending}>
      <div className="lesson-mark mint"><Icon size={23} aria-hidden="true" /></div>
      <h1 id="auth-title">{teacher ? 'Teacher sign-in' : signingUp ? 'Create your account' : 'Sign in to learn'}</h1>
      <p>{teacher ? 'Sign in with your teacher account to see class progress.' : 'Sign in before classwork so Aimen can see your points and progress.'}</p>
      <form className="auth-form" onSubmit={submit} key={String(signingUp)}>
        {signingUp && <label className="field" htmlFor="full-name"><span>Full name</span>
          <input name="full-name" id="full-name" autoComplete="name" maxLength={120} required />
        </label>}
        <label className="field" htmlFor="email"><span>Email</span>
          <input name="email" id="email" type="email" autoComplete="username" required />
        </label>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input name="password" id="password" type={showPassword ? 'text' : 'password'}
              autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={signingUp ? 6 : undefined} />
            <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {(problem || !supabase) && <p className="form-error" role="alert">{problem || 'Account access has not been set up. You can still practice as a guest.'}</p>}
        {message && <p className="feedback correct" role="status">{message}</p>}
        <button type="submit" className="button primary" disabled={pending || !supabase}>
          {pending ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>
      {!teacher && <p className="auth-switch">{signingUp ? 'Already have an account?' : 'New here?'}{' '}
        <button className="button quiet" disabled={pending} onClick={() => {
          setSigningUp(value => !value);
          setProblem('');
          setMessage('');
          setShowPassword(false);
        }}>{signingUp ? 'Sign in' : 'Create an account'}</button>
      </p>}
    </section>
  </div>;
}
