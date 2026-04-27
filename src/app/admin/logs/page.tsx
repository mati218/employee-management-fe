'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import { Loader2, FileText } from 'lucide-react';
import clsx from 'clsx';

interface LogEntry {
  _id: string;
  action: string;
  status: string;
  ipAddress: string;
  createdAt: string;
  performedBy?: { username: string };
  targetUser?: { username: string };
  details?: Record<string, unknown>;
}

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-green-100 text-green-700',
  USER_LOGIN_FAILED: 'bg-red-100 text-red-700',
  USER_REGISTERED: 'bg-blue-100 text-blue-700',
  USER_APPROVED: 'bg-green-100 text-green-700',
  USER_REJECTED: 'bg-red-100 text-red-700',
  USER_SUSPENDED: 'bg-orange-100 text-orange-700',
  OTP_SENT: 'bg-purple-100 text-purple-700',
  OTP_VERIFIED: 'bg-purple-100 text-purple-700',
  OTP_FAILED: 'bg-red-100 text-red-700',
  INVITE_CREATED: 'bg-blue-100 text-blue-700',
  INVITE_USED: 'bg-blue-100 text-blue-700',
  IP_UPDATED: 'bg-yellow-100 text-yellow-700',
  TELEGRAM_BLACKLISTED: 'bg-red-100 text-red-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback((page = 1) => {
    setLoading(true);
    adminApi.getLogs({ page, limit: 30, action: actionFilter || undefined })
      .then((res) => {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      })
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actions = [
    'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_REGISTERED', 'USER_APPROVED',
    'USER_REJECTED', 'OTP_SENT', 'OTP_VERIFIED', 'OTP_FAILED',
    'INVITE_CREATED', 'IP_UPDATED', 'TELEGRAM_BLACKLISTED',
  ];

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Audit Logs</h2>

        <div className="mb-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field w-full sm:w-64"
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No logs found</p>
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Action', 'Performed By', 'Target', 'IP', 'Status', 'Time'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'
                        )}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.performedBy?.username || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{log.targetUser?.username || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                          log.status === 'failure' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <span>Total: {pagination.total} logs</span>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchLogs(p)}
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
    </DashboardLayout>
  );
}
