'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, User, Globe, MessageCircle, Clock, Edit2 } from 'lucide-react';

interface PendingUser {
  _id: string;
  username: string;
  telegramId: string;
  fixedIp: string;
  createdAt: string;
  status: string;
}

export default function PendingUsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; username: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // IP edit state — keyed by user id
  const [editingIp, setEditingIp] = useState<Record<string, string>>({});

  const fetchPending = () => {
    setLoading(true);
    adminApi.getPendingUsers()
      .then((res) => setUsers(res.data.data))
      .catch(() => toast.error('Failed to load pending users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: string, username: string) => {
    setActionLoading(id);
    try {
      // If admin edited the IP inline, save it first
      const updatedIp = editingIp[id];
      if (updatedIp !== undefined) {
        await adminApi.updateUserIp(id, updatedIp);
      }
      await adminApi.approveUser(id);
      toast.success(`${username} approved!`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await adminApi.rejectUser(rejectModal.id, rejectReason);
      toast.success(`${rejectModal.username} rejected`);
      setUsers((prev) => prev.filter((u) => u._id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
          <span className="badge-pending">{users.length} pending</span>
        </div>

        {/* Info banner */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Tip:</strong> Verify each user's Fixed IP before approving. You can edit it inline if it needs correction — employees must login from this exact IP.
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500">No pending registrations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const currentIp = editingIp[user._id] !== undefined ? editingIp[user._id] : user.fixedIp;
              const ipChanged = editingIp[user._id] !== undefined && editingIp[user._id] !== user.fixedIp;

              return (
                <div key={user._id} className="card">
                  <div className="flex flex-col gap-4">
                    {/* User info */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{user.username}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {user.telegramId || 'No Telegram'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(user.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* IP field — always editable */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Fixed IP Address</span>
                        {ipChanged && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Modified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentIp || ''}
                          onChange={(e) => setEditingIp((prev) => ({ ...prev, [user._id]: e.target.value }))}
                          className="input-field text-sm font-mono flex-1"
                          placeholder="e.g. 192.168.1.100"
                        />
                        {ipChanged && (
                          <button
                            onClick={() => setEditingIp((prev) => { const n = { ...prev }; delete n[user._id]; return n; })}
                            className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Employee can only login from this IP. Edit if the registered IP is incorrect.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user._id, user.username)}
                        disabled={actionLoading === user._id}
                        className="btn-success flex items-center gap-1.5 text-sm flex-1 justify-center"
                      >
                        {actionLoading === user._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {ipChanged ? 'Update IP & Approve' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: user._id, username: user.username })}
                        disabled={actionLoading === user._id}
                        className="btn-danger flex items-center gap-1.5 text-sm flex-1 justify-center"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting <strong>{rejectModal.username}</strong>. Optionally provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-field resize-none h-24"
              placeholder="Reason for rejection (optional)"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleReject} disabled={!!actionLoading} className="btn-danger flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reject'}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
