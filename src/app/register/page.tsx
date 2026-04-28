'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  UserPlus, Loader2, CheckCircle, XCircle,
  Eye, EyeOff, MessageCircle, ExternalLink, ChevronRight,
} from 'lucide-react';
import { inviteApi } from '@/lib/apiServices';
import { getPublicIp } from '@/lib/getPublicIp';

const registerSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(30).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  password: z.string().min(8, 'At least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  fixedIp: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address'),
  telegramId: z.string().min(1, 'Telegram ID is required'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;
type Step = 1 | 2 | 3;
type BotStatus = 'idle' | 'waiting' | 'confirmed' | 'failed';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

async function checkBotActivatedApi(telegramId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/bot-activated/${telegramId}`);
    const data = await res.json();
    return !!data.activated;
  } catch {
    return false;
  }
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [tokenMessage, setTokenMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [botUsername, setBotUsername] = useState('emp_management_otp_bot');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 bot activation state
  const [telegramIdInput, setTelegramIdInput] = useState('');
  const [botStatus, setBotStatus] = useState<BotStatus>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 2 form telegram check
  const [telegramCheckState, setTelegramCheckState] = useState<'idle' | 'checking' | 'activated' | 'not_activated'>('idle');

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); setTokenMessage('No invite token provided'); return; }
    Promise.all([
      inviteApi.validate(token).then(() => setTokenStatus('valid')).catch((err) => {
        setTokenStatus('invalid');
        setTokenMessage(err.response?.data?.message || 'Invalid invite link');
      }),
      getPublicIp().then((ip) => { if (ip) form.setValue('fixedIp', ip); }),
      fetch(`${BASE_URL}/bot-info`).then(r => r.json()).then((d) => { if (d?.botUsername) setBotUsername(d.botUsername); }).catch(() => {}),
    ]);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start polling after user clicks Open Bot ────────────────────────────────
  const startPolling = (telegramId: string) => {
    if (!telegramId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setBotStatus('waiting');

    // Poll every 3 seconds for up to 3 minutes
    let attempts = 0;
    const maxAttempts = 60;

    pollRef.current = setInterval(async () => {
      attempts++;
      const activated = await checkBotActivatedApi(telegramId);
      if (activated) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setBotStatus('confirmed');
        toast.success('Bot activated! You can now continue.');
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setBotStatus('failed');
      }
    }, 3000);
  };

  const handleOpenBot = () => {
    if (!telegramIdInput.trim()) {
      toast.error('Enter your Telegram ID first');
      return;
    }
    window.open(`https://t.me/${botUsername}?start=register`, '_blank');
    startPolling(telegramIdInput.trim());
  };

  // ── Form submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (data: RegisterForm) => {
    // Final server-side check
    const activated = await checkBotActivatedApi(data.telegramId);
    if (!activated) {
      form.setError('telegramId', { message: 'Bot not activated. Go back to Step 1 and press Start in Telegram.' });
      return;
    }

    setLoading(true);
    try {
      await inviteApi.register({ token, username: data.username, password: data.password, fixedIp: data.fixedIp, telegramId: data.telegramId });
      setStep(3);
      toast.success('Registration successful!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const checkBotOnBlur = async (telegramId: string) => {
    if (!telegramId || telegramId.length < 5) return;
    setTelegramCheckState('checking');
    const activated = await checkBotActivatedApi(telegramId);
    setTelegramCheckState(activated ? 'activated' : 'not_activated');
    if (!activated) form.setError('telegramId', { message: 'Bot not activated. Go back to Step 1 and press Start in Telegram.' });
    else form.clearErrors('telegramId');
  };

  // ── Token states ────────────────────────────────────────────────────────────
  if (tokenStatus === 'checking') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (tokenStatus === 'invalid') return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
        <p className="text-gray-500">{tokenMessage}</p>
        <button onClick={() => router.push('/login')} className="btn-primary mt-6">Go to Login</button>
      </div>
    </div>
  );

  // ── Step indicator ──────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[{ n: 1, label: 'Activate Bot' }, { n: 2, label: 'Register' }, { n: 3, label: 'Done' }].map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step > n ? '✓' : n}
            </div>
            <span className={`text-xs mt-1 ${step === n ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < 2 && <div className={`w-12 h-0.5 mb-4 ${step > n ? 'bg-green-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // ── Step 1: Activate Bot ────────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = botStatus === 'confirmed';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">One-time setup</h1>
            <p className="text-gray-500 mt-1">Activate the OTP bot before registering</p>
          </div>

          <StepIndicator />

          <div className="card space-y-4">
            {/* Step instructions */}
            <div className="space-y-2">
              {[
                { n: '1', text: 'Enter your Telegram ID below' },
                { n: '2', text: 'Click "Open Telegram Bot" — Telegram opens' },
                { n: '3', text: 'Press the Start button in Telegram' },
                { n: '4', text: 'Come back — this page detects it automatically' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{n}</div>
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>

            {/* Telegram ID input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Telegram ID</label>
              <input
                type="text"
                value={telegramIdInput}
                onChange={(e) => {
                  setTelegramIdInput(e.target.value);
                  setBotStatus('idle');
                  if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                }}
                className="input-field font-mono"
                placeholder="e.g. 5612500412"
              />
              {/* Clear guide */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-blue-800">How to get your Telegram ID:</p>
                <p className="text-xs text-blue-700">1. Open Telegram app</p>
                <p className="text-xs text-blue-700">2. Search <span className="font-mono font-bold">@userinfobot</span></p>
                <p className="text-xs text-blue-700">3. Send <span className="font-mono font-bold">/start</span></p>
                <p className="text-xs text-blue-700">4. Copy the <span className="font-bold">Id:</span> number (e.g. <span className="font-mono">5612500412</span>)</p>
                <p className="text-xs text-red-600 font-medium mt-1">⚠️ Do NOT enter your phone number or username — only the numeric ID</p>
              </div>
            </div>

            {/* Open Bot button */}
            <button
              onClick={handleOpenBot}
              disabled={!telegramIdInput.trim() || botStatus === 'confirmed'}
              className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-colors text-sm ${
                !telegramIdInput.trim() || botStatus === 'confirmed'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Open Telegram Bot &amp; Press Start
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Status indicator */}
            {botStatus === 'waiting' && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Waiting for you to press Start...</p>
                  <p className="text-xs text-amber-600 mt-0.5">This page will update automatically once detected</p>
                </div>
              </div>
            )}

            {botStatus === 'confirmed' && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Bot activated successfully!</p>
                  <p className="text-xs text-green-600 mt-0.5">You can now continue to registration</p>
                </div>
              </div>
            )}

            {botStatus === 'failed' && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Not detected yet</p>
                  <p className="text-xs text-red-600 mt-0.5">Make sure you pressed Start in Telegram, then click the button again</p>
                </div>
              </div>
            )}

            {/* Continue button — only enabled when confirmed */}
            <button
              onClick={() => { form.setValue('telegramId', telegramIdInput); setStep(2); }}
              disabled={!canContinue}
              className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-colors text-sm ${
                canContinue
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canContinue ? (
                <><CheckCircle className="w-4 h-4" /> Continue to Register <ChevronRight className="w-4 h-4" /></>
              ) : (
                'Press Start in Telegram to continue'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Already pressed Start before?{' '}
              <button
                onClick={async () => {
                  if (!telegramIdInput.trim()) { toast.error('Enter your Telegram ID first'); return; }
                  const activated = await checkBotActivatedApi(telegramIdInput.trim());
                  if (activated) { setBotStatus('confirmed'); }
                  else { toast.error('Not found — please press Start in the bot first'); setBotStatus('failed'); }
                }}
                className="text-blue-500 hover:underline"
              >
                Check again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Success ─────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <StepIndicator />
          <div className="card text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-500 text-sm mb-6">Your account is pending admin approval. You will receive a Telegram message once approved.</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600 space-y-2 mb-6">
              <p className="font-medium text-gray-800">What happens next:</p>
              <p>✅ Bot is activated — OTPs will be delivered to your Telegram</p>
              <p>⏳ Admin reviews your registration</p>
              <p>📱 You get a Telegram notification when approved</p>
              <p>🔐 Login with your credentials + OTP</p>
            </div>
            <button onClick={() => router.push('/login')} className="btn-primary w-full">Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Registration Form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Fill in your details to register</p>
        </div>

        <StepIndicator />

        <div className="card">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-5">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-800">
              <strong>Bot activated.</strong> OTPs will be delivered to your Telegram on login.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input {...form.register('username')} className="input-field" placeholder="john_doe" autoFocus />
              {form.formState.errors.username && <p className="text-red-500 text-xs mt-1">{form.formState.errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input {...form.register('password')} type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="Min 8 chars, upper+lower+number" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input {...form.register('confirmPassword')} type="password" className="input-field" placeholder="Repeat password" />
              {form.formState.errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Work IP Address</label>
              <input {...form.register('fixedIp')} className="input-field font-mono" placeholder="Auto-detecting..." />
              <p className="text-xs text-gray-400 mt-1">Auto-filled with your current public IP.</p>
              {form.formState.errors.fixedIp && <p className="text-red-500 text-xs mt-1">{form.formState.errors.fixedIp.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID</label>
              <div className="relative">
                <input
                  {...form.register('telegramId')}
                  className={`input-field font-mono pr-10 ${telegramCheckState === 'activated' ? 'border-green-400' : telegramCheckState === 'not_activated' ? 'border-red-400' : ''}`}
                  placeholder="e.g. 5612500412"
                  onBlur={(e) => checkBotOnBlur(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {telegramCheckState === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {telegramCheckState === 'activated' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {telegramCheckState === 'not_activated' && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {telegramCheckState === 'not_activated' && (
                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs font-medium">Bot not activated for this ID</p>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-red-700 underline mt-0.5">← Go back to activate bot</button>
                </div>
              )}
              {telegramCheckState === 'activated' && <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</p>}
              {form.formState.errors.telegramId && telegramCheckState !== 'not_activated' && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.telegramId.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary px-4">← Back</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
