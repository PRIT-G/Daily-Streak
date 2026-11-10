import { useEffect, useState } from 'react';
import { ArrowRight, Flame, Github, LockKeyhole, Mail, Sparkles } from 'lucide-react';

const authHeadings = {
  register: ['YOUR NEXT CHAPTER', 'Start your streak.', 'Create your free account and make consistency feel good.'],
  login: ['WELCOME BACK', 'Pick up where you left off.', 'Your progress is right where you left it.'],
  'request-reset': ['ACCOUNT RECOVERY', 'Reset your password.', 'We’ll email you a secure, time-limited reset link.'],
  'reset-password': ['ACCOUNT RECOVERY', 'Choose a new password.', 'Use at least 10 characters for your new password.'],
  'verify-email': ['ONE LAST STEP', 'Verify your email.', 'Confirm your email address to finish setting up your account.']
};

export default function AuthScreen({
  onAuth,
  onRecoveryAction,
  onBack,
  initialMode = 'register',
  initialToken = '',
  message = '',
  messageType = 'error'
}) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', consent: false });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const isRegister = mode === 'register';
  const isLogin = mode === 'login';
  const isResetRequest = mode === 'request-reset';
  const isReset = mode === 'reset-password';
  const isVerify = mode === 'verify-email';
  const [kicker, title, subtitle] = authHeadings[mode] || authHeadings.login;

  useEffect(() => {
    if (!isVerify || !initialToken) return;
    let active = true;
    setBusy(true);
    onRecoveryAction('email-verification/confirm', { token: initialToken })
      .then((result) => {
        if (!active) return;
        setStatus(result.message);
        setMode('login');
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [initialToken, isVerify, onRecoveryAction]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (isResetRequest) {
        const result = await onRecoveryAction('password-reset/request', { email: form.email });
        setStatus(result.message);
      } else if (isReset) {
        if (form.password !== confirmPassword) throw new Error('The passwords do not match.');
        const result = await onRecoveryAction('password-reset/confirm', { token: initialToken, password: form.password });
        setStatus(result.message);
        setMode('login');
        setForm((current) => ({ ...current, password: '' }));
      } else {
        await onAuth(mode, form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await onRecoveryAction('email-verification/resend', { email: form.email });
      setStatus(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setStatus('');
    setForm((current) => ({ ...current, password: '' }));
    if (nextMode === 'login' || nextMode === 'register') window.location.hash = nextMode === 'login' ? 'login' : 'signup';
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <a className="brand brand-light" href="#" aria-label="Back to Daily Streak home"><span className="brand-mark"><Flame size={19} fill="currentColor" /></span> daily<span>streak</span></a>
        <div className="art-copy">
          <div className="eyebrow"><Sparkles size={14} /> SMALL STEPS, BIG MOMENTUM</div>
          <h1>Show up today.<br /><em>Thank yourself tomorrow.</em></h1>
          <p>Your coding journey, made visible. Build a little consistency, one day at a time.</p>
        </div>
        <div className="art-card">
          <div className="art-card-top"><span>YOUR MOMENTUM</span><span className="live-dot">●&nbsp; LIVE</span></div>
          <div className="art-streak"><Flame size={24} fill="currentColor" /><strong>12</strong><span>day streak</span></div>
          <div className="art-mini-grid">{Array.from({ length: 42 }, (_, i) => <i className={`level-${[0, 1, 2, 3, 4][(i * 13 + Math.floor(i / 7) * 7) % 5]}`} key={i} />)}</div>
          <div className="art-card-bottom"><span>2 weeks ago</span><span>this week</span><span>today</span></div>
        </div>
        <div className="art-orb orb-one" /><div className="art-orb orb-two" />
        <div className="art-copyright">A calmer kind of progress.</div>
      </section>
      <section className="auth-panel">
        <a className="auth-mobile-brand" href="#" aria-label="Back to Daily Streak home"><span className="brand-mark"><Flame size={18} fill="currentColor" /></span> daily<span>streak</span></a>
        <button className="auth-back-link" type="button" onClick={onBack}>← Back to home</button>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="auth-kicker">{kicker}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {!isVerify && (
            <form onSubmit={submit} className="auth-form">
              {isRegister && <label>Your name<div className="input-wrap"><Sparkles size={17} /><input autoComplete="name" required minLength="2" maxLength="60" placeholder="How should we call you?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></label>}
              {!isReset && <label>Email address<div className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label>}
              {!isResetRequest && !isReset && <label>Password<div className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 10 : 1} maxLength="128" placeholder={isRegister ? 'At least 10 characters' : 'Your password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></label>}
              {isReset && (
                <>
                  <label>New password<div className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" required minLength="10" maxLength="128" placeholder="At least 10 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></label>
                  <label>Confirm new password<div className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" required minLength="10" maxLength="128" placeholder="Enter it again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div></label>
                </>
              )}
              {isRegister && (
                <label className="auth-consent">
                  <input type="checkbox" required checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
                  <span>I understand this is early access and have reviewed the <a href="/#terms" target="_blank" rel="noopener noreferrer">data and service notes</a>.</span>
                </label>
              )}
              {message && <div className={messageType === 'success' ? 'inline-success' : 'inline-error'} role="status">{message}</div>}
              {status && <div className="inline-success" role="status">{status}</div>}
              {error && <div className="inline-error" role="alert">{error}</div>}
              <button className="button button-dark auth-submit" disabled={busy}>{busy ? 'One moment…' : isRegister ? 'Create your account' : isResetRequest ? 'Email me a reset link' : isReset ? 'Save new password' : 'Sign in'}<ArrowRight size={17} /></button>
            </form>
          )}
          {isVerify && (
            <div className="auth-form">
              {status && <div className="inline-success" role="status">{status}</div>}
              {error && <div className="inline-error" role="alert">{error}</div>}
              {!initialToken && <div className="inline-error" role="alert">This verification link is missing its token. Request a new email from the sign-in page.</div>}
              <button className="button button-dark auth-submit" type="button" onClick={() => switchMode('login')}>Go to sign in<ArrowRight size={17} /></button>
            </div>
          )}
          {(isLogin || isResetRequest || isReset) && (
            <div className="auth-switch">
              {isLogin ? (
                <>
                  <button type="button" onClick={() => switchMode('request-reset')}>Forgot password?</button>
                  <span> · </span>
                  <button type="button" disabled={busy || !form.email} onClick={resendVerification}>Resend verification email</button>
                </>
              ) : (
                <button type="button" onClick={() => switchMode('login')}>Back to sign in</button>
              )}
            </div>
          )}
          {(isRegister || isLogin) && (
            <>
              <div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Daily Streak?'} <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>{isRegister ? 'Sign in' : 'Create an account'}</button></div>
              <div className="auth-divider"><span /> OR CONNECT LATER <span /></div>
              <div className="provider-note"><Github size={16} /><span>Connect coding profiles after signing in.<br /><small>We only use public activity—never your provider passwords.</small></span></div>
            </>
          )}
        </div>
        <div className="auth-footer">Free during early access <span>·</span> No payment information required.</div>
      </section>
    </main>
  );
}
