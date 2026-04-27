'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/apiServices';
import { setAuth } from '@/lib/auth';
import { getPublicIp } from '@/lib/getPublicIp';

const loginSchema = z.object({
  login: z.string().min(3, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

type LoginForm = z.infer<typeof loginSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [userId, setUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicIp, setPublicIp] = useState('');

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  // Fetch real public IP once on mount
  useEffect(() => {
    getPublicIp().then(setPublicIp);
  }, []);

  const redirectUser = (role: string) => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login({
        login: data.login,
        password: data.password,
        clientIp: publicIp || undefined,
      });
      const { otpSkipped, token, user, userId: uid } = res.data;

      if (otpSkipped && token) {
        setAuth(token, user);
        toast.success('Login successful!');
        redirectUser(user.role);
        return;
      }

      setUserId(uid);
      setStep('otp');
      toast.success('OTP sent to your Telegram!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpForm) => {
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ userId, otp: data.otp });
      setAuth(res.data.token, res.data.user);
      toast.success('Login successful!');
      redirectUser(res.data.user.role);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-500 mt-1">Secure access portal</p>
        </div>

        <div className="card">
          {step === 'credentials' ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign In</h2>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email or Username
                  </label>
                  <input
                    {...loginForm.register('login')}
                    className="input-field"
                    placeholder="admin@demo.com or admin"
                    autoComplete="username"
                    autoFocus
                  />
                  {loginForm.formState.errors.login && (
                    <p className="text-red-500 text-xs mt-1">
                      {loginForm.formState.errors.login.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Show detected IP so user knows what's being used */}
                {publicIp && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Detected IP: <span className="font-mono">{publicIp}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Demo hint */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700 font-medium mb-1">Demo credentials</p>
                <p className="text-xs text-blue-600">Email: <span className="font-mono">admin@demo.com</span></p>
                <p className="text-xs text-blue-600">Password: <span className="font-mono">Admin@123456</span></p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Verify OTP</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the 6-digit code sent to your Telegram
                </p>
              </div>

              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    One-Time Password
                  </label>
                  <input
                    {...otpForm.register('otp')}
                    className="input-field text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-red-500 text-xs mt-1">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
                >
                  ← Back to login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need access? Contact your administrator for an invite link.
        </p>
      </div>
    </div>
  );
}
