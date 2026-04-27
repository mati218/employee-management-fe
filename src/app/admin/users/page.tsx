'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import { Search, Loader2, Globe, MessageCircle, Edit2, Ban, Trash2 } from 'lucide-react';
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

interface EditModal {
  id: string;
  username: string;
  currentIp: string;
  currentTelegramId: string;
}

function AllUsersContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [newIp, setNewIp] = useState('');
  const [newTelegramId, setNewTelegramId] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; username: string } | null>(null);

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

  const openEditModal = (user: User) => {
    setEditModal({
      id: user._id,
      username: user.username,
      currentIp: user.fixedIp,
      currentTelegramId: user.telegramId,
    });
    setNewIp(user.fixedIp || '');
    setNewTelegramId(user.telegramId || '');
  };

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

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(deleteModal.id);
    try {
      await adminApi.deleteUser(deleteModal.id);
      toast.success(`"${deleteModal.username}" permanently deleted`);
      setDeleteModal(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setActionLoading(editModal.id);
    try {
      const promises = [];

      // Update IP if changed
      if (newIp !== editModal.currentIp) {
        promises.push(adminApi.updateUserIp(editModal.id, newIp));
      }

      // Update Telegram ID if changed
      if (newTelegramId !== editModal.currentTelegramId) {
        promises.push(adminApi.updateUserTelegram(editModal.id, newTelegramId));
      }

      if (promises.length === 0) {
        toast('No changes made');
        setEditModal(null);
        return;
      }

      await Promise.all(promises);
      toast.success(`${editModal.username} updated successfully`);
      setEditModal(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update');
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
                    {['Username', 'Status', 'Role', 'Fixed IP', 'Telegram ID', 'Last Login', 'Actions'].map((h) => (
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
                        <span className="flex items-center gap-1 text-gray-500 font-mono text-xs">
                          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                          {user.fixedIp || <span className="text-red-400">Not set</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500 font-mono text-xs">
                          <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {user.telegramId || <span className="text-red-400">Not set</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded"
                            title="Edit IP & Telegram ID"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.status === 'approved' && user.role !== 'admin' && (
                            <button
                              onClick={() => handleSuspend(user._id, user.username)}
                              disabled={actionLoading === user._id}
                              className="text-orange-500 hover:text-orange-700 p-1 rounded"
                              title="Suspend"
                            >
                              {actionLoading === user._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => setDeleteModal({ id: user._id, username: user.username })}
                              disabled={actionLoading === user._id}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Edit Modal — IP + Telegram ID */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Updating: <strong>{editModal.username}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Fixed IP Address
                </label>
                <input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="input-field font-mono"
                  placeholder="192.168.1.100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> Telegram ID
                </label>
                <input
                  value={newTelegramId}
                  onChange={(e) => setNewTelegramId(e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g. 5612500494"
                />
                <p className="text-xs text-gray-400 mt-1">
                  User can get their ID from <span className="font-mono">@userinfobot</span> on Telegram
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveEdit}
                disabled={!!actionLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button onClick={() => setEditModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                You are about to permanently delete{' '}
                <strong className="font-mono">{deleteModal.username}</strong>.
                Their account, OTPs, and all associated data will be removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Permanently
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
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
