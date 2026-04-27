'use client';
import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { UserPlus, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { inviteApi } from '@/lib/apiServices';
import { getPublicIp } from '@/lib/getPublicIp';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  fixedIp: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address'),
  telegramId: z.string().min(1, 'Telegram ID is required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [tokenMessage, setTokenMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setTokenMessage('No invite token provided');
      return;
    }

    // Validate token and fetch public IP in parallel
    Promise.all([
      inviteApi.validate(token).then(() => setTokenStatus('valid')).catch((err) => {
        setTokenStatus('invalid');
        setTokenMessage(err.response?.data?.message || 'Invalid invite link');
      }),
      getPublicIp().then((ip) => {
        if (ip) form.setValue('fixedIp', ip);
      }),
    ]);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await inviteApi.register({
        token,
        username: data.username,
        password: data.password,
        fixedIp: data.fixedIp,
        telegramId: data.telegramId,
      });
      setSuccess(true);
      toast.success('Registration successful!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (tokenStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
          <p className="text-gray-500">{tokenMessage}</p>
          <button onClick={() => router.push('/login')} className="btn-primary mt-6">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-500 mb-4">
            Your account is pending admin approval. You will receive a Telegram notification once approved.
          </p>
          <button onClick={() => router.push('/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Complete your registration</p>
        </div>

        <div className="card">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input {...form.register('username')} className="input-field" placeholder="john_doe" />
              {form.formState.errors.username && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...form.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min 8 chars, upper+lower+number"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                {...form.register('confirmPassword')}
                type="password"
                className="input-field"
                placeholder="Repeat password"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Work IP Address</label>
              <input {...form.register('fixedIp')} className="input-field font-mono" placeholder="Auto-detecting..." />
              <p className="text-xs text-gray-400 mt-1">
                Auto-filled with your current public IP. Change only if you use a different fixed work IP.
              </p>
              {form.formState.errors.fixedIp && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.fixedIp.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID</label>
              <input {...form.register('telegramId')} className="input-field" placeholder="Your Telegram user ID" />
              <p className="text-xs text-gray-400 mt-1">Used for OTP delivery. Get it from @userinfobot on Telegram.</p>
              {form.formState.errors.telegramId && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.telegramId.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
