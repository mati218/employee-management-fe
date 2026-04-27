'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import { Users, Clock, CheckCircle, XCircle, Link2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Stats {
  users: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
  invites: { active: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load stats'))
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

  const statCards = [
    { label: 'Total Employees', value: stats?.users.total ?? 0, icon: <Users className="w-6 h-6" />, color: 'blue', href: '/admin/users' },
    { label: 'Pending Approval', value: stats?.users.pending ?? 0, icon: <Clock className="w-6 h-6" />, color: 'yellow', href: '/admin/users/pending' },
    { label: 'Approved', value: stats?.users.approved ?? 0, icon: <CheckCircle className="w-6 h-6" />, color: 'green', href: '/admin/users?status=approved' },
    { label: 'Rejected', value: stats?.users.rejected ?? 0, icon: <XCircle className="w-6 h-6" />, color: 'red', href: '/admin/users?status=rejected' },
    { label: 'Suspended', value: stats?.users.suspended ?? 0, icon: <AlertCircle className="w-6 h-6" />, color: 'gray', href: '/admin/users?status=suspended' },
    { label: 'Active Invites', value: stats?.invites.active ?? 0, icon: <Link2 className="w-6 h-6" />, color: 'purple', href: '/admin/invites' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <div className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-gray-500">{card.label}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/users/pending" className="btn-primary text-sm">
              Review Pending Users
            </Link>
            <Link href="/admin/invites" className="btn-secondary text-sm">
              Generate Invite Link
            </Link>
            <Link href="/admin/logs" className="btn-secondary text-sm">
              View Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
