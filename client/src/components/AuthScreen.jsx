import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Flame,
  Github,
  LockKeyhole,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';

const authHeadings = {
  register: [
    'YOUR NEXT CHAPTER',
    'Start your streak.',
    'Create your free account and make consistency feel good.',
  ],
  login: [
    'WELCOME BACK',
    'Pick up where you left off.',
    'Your progress is right where you left it.',
  ],
  'request-reset': [
    'ACCOUNT RECOVERY',
    'Reset your password.',
    'We’ll email you a secure, time-limited reset link.',
  ],
  'reset-password': [
    'ACCOUNT RECOVERY',
    'Choose a new password.',
    'Use at least 10 characters for your new password.',
  ],
  'verify-email': [
    'ONE LAST STEP',
    'Verify your email.',
    'Confirm your email address to finish setting up your account.',
  ],
};

export default function AuthScreen({
  onAuth,
  onRecoveryAction,
  onBack,
  initialMode = 'register',
  initialToken = '',
  message = '',
  messageType = 'error',
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
    return () => {
      active = false;
    };
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
        const result = await onRecoveryAction('password-reset/confirm', {
          token: initialToken,
          password: form.password,
        });
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
    if (nextMode === 'login' || nextMode === 'register') {
      window.location.hash = nextMode === 'login' ? 'login' : 'signup';
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <a className="brand brand-light" href="#" aria-label="Back to Daily Streak home">
          <span className="brand-mark">
            <Flame size={19} fill="currentColor" />
          </span>{' '}
          daily<span>streak</span>
        </a>
        <div className="art-copy">
          <div className="eyebrow">
            <Sparkles size={14} /> SMALL STEPS, BIG MOMENTUM
          </div>
          <h1>
            Show up today.
            <br />
            <em>Thank yourself tomorrow.</em>
          </h1>
          <p>Your coding journey, made visible. Build a little consistency, one day at a time.</p>
        </div>
        <div className="art-card">
          <div className="art-card-top">
            <span>YOUR MOMENTUM</span>
            <span className="live-dot">●&nbsp; LIVE</span>
          </div>
          <div className="art-streak">
            <Flame size={24} fill="currentColor" />
            <strong>12</strong>
            <span>day streak</span>
          </div>
          <div className="art-mini-grid">
            {Array.from({ length: 42 }, (_, i) => (
              <i
                className={`level-${[0, 1, 2, 3, 4][(i * 13 + Math.floor(i / 7) * 7) % 5]}`}
                key={i}
              />
            ))}
          </div>
          <div className="art-card-bottom">
            <span>2 weeks ago</span>
            <span>this week</span>
            <span>today</span>
          </div>
        </div>
        <div className="art-orb orb-one" />
        <div className="art-orb orb-two" />
        <div className="art-copyright">
          A calmer kind of progress. Powered by Better Auth & shadcn/ui.
        </div>
      </section>

      <section className="auth-panel">
        <a className="auth-mobile-brand" href="#" aria-label="Back to Daily Streak home">
          <span className="brand-mark">
            <Flame size={18} fill="currentColor" />
          </span>{' '}
          daily<span>streak</span>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="auth-back-link text-xs -ml-2 mb-2"
          onClick={onBack}
        >
          ← Back to home
        </Button>

        <div className="auth-form-wrap max-w-md w-full">
          <Card className="border border-[#e8ece8] shadow-md bg-white">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-[#7a827b] uppercase">
                  {kicker}
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Early Access
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-[#252b26]">
                {title}
              </CardTitle>
              <CardDescription className="text-xs text-[#898f88]">{subtitle}</CardDescription>

              {(isLogin || isRegister) && (
                <Tabs value={mode} onValueChange={switchMode} className="w-full pt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Create Account</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {!isVerify && (
                <form onSubmit={submit} className="space-y-4">
                  {isRegister && (
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-name">Your Name</Label>
                      <div className="relative">
                        <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-[#898f88]" />
                        <Input
                          id="auth-name"
                          className="pl-9"
                          autoComplete="name"
                          required
                          minLength={2}
                          maxLength={60}
                          placeholder="How should we call you?"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {!isReset && (
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#898f88]" />
                        <Input
                          id="auth-email"
                          type="email"
                          className="pl-9"
                          autoComplete="email"
                          required
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {!isResetRequest && !isReset && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auth-password">Password</Label>
                        {isLogin && (
                          <button
                            type="button"
                            className="text-xs text-[#2f7459] hover:underline cursor-pointer"
                            onClick={() => switchMode('request-reset')}
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-[#898f88]" />
                        <Input
                          id="auth-password"
                          type="password"
                          className="pl-9"
                          autoComplete={isRegister ? 'new-password' : 'current-password'}
                          required
                          minLength={isRegister ? 10 : 1}
                          maxLength={128}
                          placeholder={isRegister ? 'At least 10 characters' : 'Your password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {isReset && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-new-password">New Password</Label>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-[#898f88]" />
                          <Input
                            id="reset-new-password"
                            type="password"
                            className="pl-9"
                            autoComplete="new-password"
                            required
                            minLength={10}
                            maxLength={128}
                            placeholder="At least 10 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-[#898f88]" />
                          <Input
                            id="reset-confirm-password"
                            type="password"
                            className="pl-9"
                            autoComplete="new-password"
                            required
                            minLength={10}
                            maxLength={128}
                            placeholder="Enter it again"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {isRegister && (
                    <label className="flex items-start gap-2.5 text-xs text-[#7a827b] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-[#e8ece8] text-[#2f7459] focus:ring-[#2f7459]"
                        required
                        checked={form.consent}
                        onChange={(event) => setForm({ ...form, consent: event.target.checked })}
                      />
                      <span>
                        I understand this is early access and have reviewed the{' '}
                        <a
                          href="/#terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2f7459] underline"
                        >
                          data and service notes
                        </a>
                        .
                      </span>
                    </label>
                  )}

                  {message && (
                    <Alert variant={messageType === 'success' ? 'success' : 'destructive'}>
                      {messageType === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  {status && (
                    <Alert variant="success">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{status}</AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#252b26] hover:bg-[#1a1f1b] text-white"
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> One moment…
                      </>
                    ) : isRegister ? (
                      <>
                        Create your account <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    ) : isResetRequest ? (
                      <>
                        Email me a reset link <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    ) : isReset ? (
                      <>
                        Save new password <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Sign in <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {isVerify && (
                <div className="space-y-4">
                  {status && (
                    <Alert variant="success">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{status}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {!initialToken && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This verification link is missing its token. Request a new email from the
                        sign-in page.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button className="w-full" onClick={() => switchMode('login')}>
                    Go to sign in <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-0">
              {(isLogin || isResetRequest || isReset) && (
                <div className="text-xs text-center text-[#7a827b] w-full">
                  {isLogin ? (
                    <button
                      type="button"
                      disabled={busy || !form.email}
                      className="text-[#2f7459] hover:underline disabled:opacity-50 cursor-pointer"
                      onClick={resendVerification}
                    >
                      Resend verification email
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-[#2f7459] hover:underline cursor-pointer"
                      onClick={() => switchMode('login')}
                    >
                      Back to sign in
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#f0f2f0] w-full flex items-center justify-center gap-2 text-xs text-[#898f88]">
                <Github size={14} />
                <span>Connect GitHub, LeetCode, Codeforces & GitLab after signing in</span>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="auth-footer text-xs text-[#9a9f9b] mt-4">
          Free during early access <span>·</span> No payment information required.
        </div>
      </section>
    </main>
  );
}
