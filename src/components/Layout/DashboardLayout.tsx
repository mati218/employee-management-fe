'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { authApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Users,
  Link2,
  FileText,
  LogOut,
  Menu,
  X,
  Shield,
  User,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, adminOnly: true },
  { label: 'Pending Users', href: '/admin/users/pending', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { label: 'All Users', href: '/admin/users', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { label: 'Invite Links', href: '/admin/invites', icon: <Link2 className="w-5 h-5" />, adminOnly: true },
  { label: 'Audit Logs', href: '/admin/logs', icon: <FileText className="w-5 h-5" />, adminOnly: true },
  { label: 'My Profile', href: '/dashboard', icon: <User className="w-5 h-5" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(getUser());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
    setUser(getUser());
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  };

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:inset-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">EMS</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Signed in as</p>
          <p className="font-medium text-gray-900 mt-0.5">{user?.username}</p>
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
            user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
          )}>
            {user?.role}
          </span>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.label}
              {pathname === item.href && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Employee Management System</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
