'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { userApi } from '@/lib/apiServices';
import { User, Shield, Clock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  _id: string;
  username: string;
  role: string;
  status: string;
  telegramId: string;
  fixedIp: string;
  lastLogin: string;
  lastLoginIp: string;
  createdAt: string;
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getProfile()
      .then((res) => setProfile(res.data.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">My Profile</h2>

        <div className="card space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{profile?.username}</h3>
              <span className="badge-approved">{profile?.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Role" value={profile?.role || '-'} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Fixed IP" value={profile?.fixedIp || '-'} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Telegram ID" value={profile?.telegramId || '-'} />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Last Login"
              value={profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}
            />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Last Login IP" value={profile?.lastLoginIp || '-'} />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Member Since"
              value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
