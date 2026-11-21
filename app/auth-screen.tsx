import { useState, type FormEvent } from 'react';
import { ArrowRight, Code2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthScreen({ checkingSession }: { checkingSession: boolean }) {
  const [signingUp, setSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || pending) return;
    setPending(true);
    setError('');
    window.history.replaceState(null, '', '#Dashboard');

    try {
      const credentials = { email: email.trim(), password };
      const result = signingUp
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

      if (result.error) setError(result.error.message);
      else if (!result.data.session) setError('Could not start your session. Try logging in.');
    } catch {
      setError('Could not connect to OOPnest. Try again.');
    } finally {
      setPending(false);
    }
  }

  function switchMode() {
    setSigningUp(value => !value);
    setPassword('');
    setShowPassword(false);
    setError('');
  }

  return <main className="account-page">
    <section className="account-card" aria-labelledby="account-title" aria-busy={checkingSession || pending}>
      <div className="brand account-brand">
        <span className="brand-mark"><Code2 size={25} aria-hidden="true"/></span>
        oopnest<span className="brand-dot">.</span>
      </div>
      {checkingSession ? <>
        <h1 id="account-title">Your learning workspace</h1>
        <p className="account-intro" role="status">Checking your session…</p>
      </> : <>
        <div>
          <h1 id="account-title">{signingUp ? 'Create your account' : 'Log in'}</h1>
          <p className="account-intro">{signingUp ? 'Start learning C++ with your own workspace.' : 'Open your C++ learning workspace.'}</p>
        </div>
        <form className="account-form" onSubmit={submit}>
          <label htmlFor="account-email">Email address</label>
          <input id="account-email" name="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/>
          <label htmlFor="account-password">Password</label>
          <div className="account-password">
            <input id="account-password" name="password" type={showPassword ? 'text' : 'password'}
              autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={signingUp ? 6 : undefined}
              aria-describedby={signingUp ? 'account-password-hint' : undefined}
              value={password} onChange={event => setPassword(event.target.value)}/>
            <button type="button" className="icon-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
            </button>
          </div>
          {signingUp && <p id="account-password-hint" className="account-hint">Use at least 6 characters.</p>}
          {(error || !supabase) && <p className="account-error" role="alert">{error || 'Account access is unavailable. Check the Supabase configuration.'}</p>}
          <button type="submit" className="button primary" disabled={pending || !supabase}>
            {pending ? (signingUp ? 'Creating account…' : 'Logging in…') : (signingUp ? 'Sign up' : 'Log in')}
            <ArrowRight size={17} aria-hidden="true"/>
          </button>
        </form>
        <p className="account-switch">
          {signingUp ? 'Already have an account?' : 'New to OOPnest?'}{' '}
          <button type="button" className="text-button" disabled={pending} onClick={switchMode}>{signingUp ? 'Log in' : 'Sign up'}</button>
        </p>
      </>}
    </section>
  </main>;
}
