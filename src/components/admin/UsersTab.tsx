import React, { useEffect, useState } from 'react';
import { apiCall } from '../../api/api';
import { AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { UserRow, TemplateSummary, OverrideInfo, Scope } from './types';

const ROLE_LABELS: Record<number, string> = { 4: 'Platform Admin', 1: 'Member' };

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [override, setOverride] = useState<OverrideInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chosenTemplate, setChosenTemplate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const usersRes = await apiCall({ endpoint: '/api/v2/auth/users', jwtToken: true });
      setUsers(usersRes.message ?? []);
      const tplRes = await apiCall({ endpoint: '/api/v2/auth/templates', jwtToken: true });
      setTemplates(tplRes.message?.templates ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (userId: string) => {
    setDetailLoading(true);
    setScope(null);
    setOverride(null);
    setChosenTemplate('');
    setReason('');
    try {
      const scopeRes = await apiCall({ endpoint: `/api/v2/auth/users/${userId}/scope`, jwtToken: true });
      setScope(scopeRes.message ?? null);
      const ovRes = await apiCall({ endpoint: `/api/v2/auth/users/${userId}/template-override`, jwtToken: true });
      setOverride(ovRes.message ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load user detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggle = (userId: string) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    loadDetail(userId);
  };

  const setOverrideForUser = async (userId: string) => {
    if (!chosenTemplate) return;
    try {
      await apiCall({
        endpoint: `/api/v2/auth/users/${userId}/template-override`,
        method: 'POST',
        body: { template_id: chosenTemplate, reason: reason || undefined },
        jwtToken: true,
      });
      loadDetail(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to set override');
    }
  };

  const clearOverrideForUser = async (userId: string) => {
    try {
      await apiCall({ endpoint: `/api/v2/auth/users/${userId}/template-override`, method: 'DELETE', jwtToken: true });
      loadDetail(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to clear override');
    }
  };

  const featureList = (s: Scope): string => {
    const on = [
      s.video_model_1 && 'Video 1', s.video_model_2 && 'Video 2',
      s.audio_detection && 'Audio', s.audio_transcription && 'Transcription',
      s.reasoning && 'Reasoning',
    ].filter(Boolean);
    return on.length ? (on as string[]).join(', ') : 'None';
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading users...</div>;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Users</h2>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-black/20 text-xs text-gray-500 uppercase">
            <tr><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Detail</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => (
              <React.Fragment key={u.user_id}>
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <button onClick={() => toggle(u.user_id)} className="flex items-center gap-2 text-left">
                      {expandedId === u.user_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {u.email}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{u.role_id != null ? (ROLE_LABELS[u.role_id] ?? `Role ${u.role_id}`) : '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => toggle(u.user_id)} className="text-blue-400 text-sm">{expandedId === u.user_id ? 'Hide' : 'Manage'}</button>
                  </td>
                </tr>
                {expandedId === u.user_id && (
                  <tr className="bg-black/30">
                    <td colSpan={3} className="px-6 py-4">
                      {detailLoading ? (
                        <p className="text-gray-400 text-sm">Loading…</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Effective Permissions</p>
                            {scope ? (
                              <p className="text-sm text-gray-300">
                                {featureList(scope)} · Max file {scope.max_file_size_mb ?? '∞'} MB · {scope.uploads_month ?? 0}/{scope.max_uploads_per_month ?? '∞'} uploads this month
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">No scope (platform default).</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Template Override</p>
                            {override ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-blue-400">Override: {override.template_name ?? '(deleted)'}{override.override_reason ? ` — ${override.override_reason}` : ''}</span>
                                <button onClick={() => clearOverrideForUser(u.user_id)} className="flex items-center gap-1 text-red-400 text-sm hover:underline"><X size={14} /> Clear override</button>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Inherited from group.</p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Set override template</label>
                              <select value={chosenTemplate} onChange={(e) => setChosenTemplate(e.target.value)} className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500">
                                <option value="">Select template…</option>
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
                              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500" />
                            </div>
                            <button onClick={() => setOverrideForUser(u.user_id)} disabled={!chosenTemplate} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg">Set override</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-4 text-gray-500">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab;
