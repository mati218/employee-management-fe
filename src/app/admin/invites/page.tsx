'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { adminApi } from '@/lib/apiServices';
import toast from 'react-hot-toast';
import { Link2, Plus, Copy, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface Invite {
  _id: string;
  token: string;
  used: boolean;
  expiresAt: string;
  expiryMinutes: number;
  note: string;
  createdAt: string;
  createdBy: { username: string };
  usedBy?: { username: string };
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [note, setNote] = useState('');
  const [newInviteUrl, setNewInviteUrl] = useState('');

  const fetchInvites = () => {
    setLoading(true);
    adminApi.listInvites({ limit: 50 })
      .then((res) => setInvites(res.data.data))
      .catch(() => toast.error('Failed to load invites'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvites(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await adminApi.generateInvite({ expiryMinutes, note: note || undefined });
      setNewInviteUrl(res.data.data.inviteUrl);
      toast.success('Invite link generated!');
      setShowForm(false);
      setNote('');
      fetchInvites();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to generate invite');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.used) return 'used';
    if (new Date() > new Date(invite.expiresAt)) return 'expired';
    return 'active';
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Invite Links</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Generate Invite
          </button>
        </div>

        {/* Generate form */}
        {showForm && (
          <div className="card mb-6 border-blue-200 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-4">New Invite Link</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (minutes)</label>
                <input
                  type="number"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                  className="input-field"
                  min={5}
                  max={10080}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-field"
                  placeholder="e.g. For John Doe"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2">
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* New invite URL display */}
        {newInviteUrl && (
          <div className="card mb-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800 mb-1">Invite link ready!</p>
                <p className="text-sm text-green-700 break-all font-mono bg-green-100 rounded p-2">{newInviteUrl}</p>
              </div>
              <button onClick={() => copyToClipboard(newInviteUrl)} className="btn-success text-sm flex items-center gap-1.5 flex-shrink-0">
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Invites list */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : invites.length === 0 ? (
          <div className="card text-center py-12">
            <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invite links yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => {
              const status = getInviteStatus(invite);
              return (
                <div key={invite._id} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {status === 'active' && <span className="badge-approved">Active</span>}
                        {status === 'used' && <span className="badge-suspended">Used</span>}
                        {status === 'expired' && <span className="badge-rejected">Expired</span>}
                        {invite.note && <span className="text-sm text-gray-500">— {invite.note}</span>}
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{invite.token.substring(0, 32)}...</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(invite.expiresAt).toLocaleString()}
                        </span>
                        <span>By: {invite.createdBy?.username}</span>
                        {invite.usedBy && <span>Used by: {invite.usedBy.username}</span>}
                      </div>
                    </div>
                    {status === 'active' && (
                      <button
                        onClick={() => {
                          const baseUrl = 'http://localhost:3000';
                          copyToClipboard(`${baseUrl}/register?token=${invite.token}`);
                        }}
                        className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
