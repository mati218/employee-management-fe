'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import { Search, Loader2, Globe, MessageCircle, Edit2, Ban } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';

interface User {
  _id: string;
  username: string;
  role: string;
  status: string;
  telegramId: string;
  fixedIp: string;
  lastLogin: string;
  createdAt: string;
}

function AllUsersContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [editIpModal, setEditIpModal] = useState<{ id: string; username: string; currentIp: string } | null>(null);
  const [newIp, setNewIp] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback((page = 1) => {
    setLoading(true);
    adminApi.getAllUsers({ page, limit: 20, status: statusFilter || undefined, search: search || undefined })
      .then((res) => {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSuspend = async (id: string, username: string) => {
    if (!confirm(`Suspend ${username}?`)) return;
    setActionLoading(id);
    try {
      await adminApi.suspendUser(id);
      toast.success(`${username} suspended`);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateIp = async () => {
    if (!editIpModal) return;
    setActionLoading(editIpModal.id);
    try {
      await adminApi.updateUserIp(editIpModal.id, newIp);
      toast.success('IP updated');
      setEditIpModal(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update IP');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      suspended: 'badge-suspended',
    };
    return <span className={map[status] || 'badge-pending'}>{status}</span>;
  };

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">All Users</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
              placeholder="Search by username or Telegram ID..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Username', 'Status', 'Role', 'Fixed IP', 'Telegram', 'Last Login', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">No users found</td>
                    </tr>
                  ) : users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                      <td className="px-4 py-3">{statusBadge(user.status)}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{user.role}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Globe className="w-3.5 h-3.5" />
                          {user.fixedIp || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {user.telegramId || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditIpModal({ id: user._id, username: user.username, currentIp: user.fixedIp }); setNewIp(user.fixedIp || ''); }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded"
                            title="Update IP"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.status === 'approved' && user.role !== 'admin' && (
                            <button
                              onClick={() => handleSuspend(user._id, user.username)}
                              disabled={actionLoading === user._id}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              title="Suspend"
                            >
                              {actionLoading === user._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <span>Total: {pagination.total}</span>
                <div className="flex gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchUsers(p)}
                      className={clsx(
                        'w-8 h-8 rounded-lg text-sm font-medium',
                        p === pagination.page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit IP Modal */}
      {editIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Update Fixed IP</h3>
            <p className="text-sm text-gray-500 mb-4">For user: <strong>{editIpModal.username}</strong></p>
            <input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="input-field"
              placeholder="192.168.1.100"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleUpdateIp} disabled={!!actionLoading} className="btn-primary flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update IP'}
              </button>
              <button onClick={() => setEditIpModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AllUsersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    }>
      <AllUsersContent />
    </Suspense>
  );
}
