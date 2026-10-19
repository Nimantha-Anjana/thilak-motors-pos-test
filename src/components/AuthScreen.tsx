import { useState } from 'react';
import { Bike, Lock, Mail, Loader2, Sun, Moon, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { showToast } from '@/components/Toast';

type Step = 'signin' | 'forgot' | 'code' | 'newpw';

export function AuthScreen() {
  const { signIn, recovering, sendResetCode, verifyResetCode, completeReset, cancelReset } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [step, setStepRaw] = useState<Step>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // While the recovery session is active the app keeps this screen up on the "new password" step
  const current: Step = recovering ? 'newpw' : step;

  const setStep = (s: Step) => {
    setStepRaw(s);
    setError(null);
    setInfo(null);
  };

  const run = async (fn: () => Promise<{ error: string | null }>, onOk: () => void) => {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setError(error);
    else onOk();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (current === 'signin') {
      if (!email || !password) return setError('Please enter both email and password.');
      await run(() => signIn(email.trim(), password), () => showToast('Welcome back!', 'success'));
    } else if (current === 'forgot') {
      if (!email) return setError('Please enter your email.');
      await run(() => sendResetCode(email.trim()), () => {
        setStepRaw('code');
        setInfo(`We sent a verification code to ${email.trim()}.`);
      });
    } else if (current === 'code') {
      if (code.trim().length < 6) return setError('Enter the code from your email.');
      await run(() => verifyResetCode(email.trim(), code.trim()), () => setInfo(null));
    } else {
      if (newPw.length < 6) return setError('Password must be at least 6 characters.');
      if (newPw !== confirmPw) return setError('Passwords do not match.');
      await run(() => completeReset(newPw), () => showToast('Password updated. You are signed in.', 'success'));
    }
  };

  const resend = async () => {
    setBusy(true);
    const { error } = await sendResetCode(email.trim());
    setBusy(false);
    if (error) setError(error);
    else setInfo('A new code has been sent.');
  };

  const titles: Record<Step, [string, string]> = {
    signin: ['Sign in to your account', 'Welcome back. Enter your details to continue.'],
    forgot: ['Forgot password?', "Enter your login email and we'll send you a verification code."],
    code: ['Enter verification code', 'Type the code we emailed you.'],
    newpw: ['Set a new password', 'Choose a new password for your account.'],
  };
  const inputBase =
    'w-full pl-10 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all';
  const label = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform shadow-sm z-20"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Branding side */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-8 lg:p-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Thilak Motors</h1>
              <p className="text-sm text-slate-300">Motorbike Repair &amp; Service Center</p>
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
            The complete POS system for your repair shop.
          </h2>
          <p className="text-slate-300 leading-relaxed mb-8">
            Manage customers, vehicles, services, and spare parts. Generate professional invoices,
            track inventory, and watch your shop's performance in real time.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Smart Billing', value: 'Fast checkout' },
              { label: 'Inventory', value: 'Stock alerts' },
              { label: 'Customers', value: 'Vehicle history' },
              { label: 'Analytics', value: 'Live dashboard' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
              <Bike className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Thilak Motors</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Motorbike Repair &amp; Service Center</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{titles[current][0]}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">{titles[current][1]}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(current === 'signin' || current === 'forgot') && (
              <div>
                <label className={label}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputBase} autoComplete="email" />
                </div>
              </div>
            )}

            {current === 'signin' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <button type="button" onClick={() => setStep('forgot')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputBase} autoComplete="current-password" />
                </div>
              </div>
            )}

            {current === 'code' && (
              <div>
                <label className={label}>Verification code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="123456"
                    className={`${inputBase} tracking-[0.3em] font-mono`}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
                <button type="button" onClick={resend} disabled={busy} className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-60">
                  Didn't get it? Resend code
                </button>
              </div>
            )}

            {current === 'newpw' && (
              <>
                <div>
                  <label className={label}>New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputBase} autoComplete="new-password" autoFocus />
                  </div>
                </div>
                <div>
                  <label className={label}>Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputBase} autoComplete="new-password" />
                  </div>
                </div>
              </>
            )}

            {info && (
              <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
                {info}
              </div>
            )}
            {error && (
              <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-colors disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {{ signin: 'Sign in', forgot: 'Send code', code: 'Verify code', newpw: 'Save new password' }[current]}
            </button>

            {current !== 'signin' && (
              <button
                type="button"
                onClick={() => (recovering ? cancelReset().then(() => setStep('signin')) : setStep('signin'))}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
