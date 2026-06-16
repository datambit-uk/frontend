import React, { useEffect, useState } from 'react';
import { apiCall } from '../../api/api';
import { AlertCircle, ChevronDown, ChevronRight, KeyRound, Copy, Check } from 'lucide-react';
import { UserRow, ROLE_OPTIONS, roleLabel } from './types';

const AccessTab: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate access code
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<number>(ROLE_OPTIONS[0].id);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ email: string; access_code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Role management
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chosenRole, setChosenRole] = useState<number>(ROLE_OPTIONS[0].id);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiCall({ endpoint: '/api/v2/auth/users', jwtToken: true });
      setUsers(res.message ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!email.trim()) return;
    setGenerating(true);
    setGeneratedCode(null);
    setCopied(false);
    try {
      const res = await apiCall({
        endpoint: '/api/v2/auth/save/generate-access-code',
        method: 'POST',
        body: { email: email.trim(), role },
        jwtToken: true,
      });
      setGeneratedCode(res.message ?? null);
      setEmail('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to generate access code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — code is still shown on screen
    }
  };

  const toggle = (u: UserRow) => {
    if (expandedId === u.user_id) { setExpandedId(null); return; }
    setExpandedId(u.user_id);
    setChosenRole(u.role_id ?? ROLE_OPTIONS[0].id);
  };

  const saveRole = async (userId: string) => {
    setSavingRole(true);
    try {
      await apiCall({
        endpoint: '/api/v2/auth/update/user/role',
        method: 'POST',
        body: { user_id: userId, role_id: chosenRole },
        jwtToken: true,
      });
      setError(null);
      setExpandedId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Access</h2>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Generate access code */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-md font-bold mb-1 flex items-center gap-2"><KeyRound size={18} /> Generate Access Code</h3>
        <p className="text-sm text-gray-400 mb-4">
          Invite a new user by organisation email. Personal domains (gmail, yahoo, …) are rejected.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="invite-email" className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organisation.com"
              className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="invite-role" className="block text-xs text-gray-500 mb-1">Role</label>
            <select
              id="invite-role"
              aria-label="New user role"
              value={role}
              onChange={(e) => setRole(Number(e.target.value))}
              className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!email.trim() || generating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {generatedCode && (
          <div className="mt-4 bg-black/40 border border-green-800/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Access code for {generatedCode.email}</p>
              <p className="text-2xl font-mono tracking-widest text-green-400">{generatedCode.access_code}</p>
              <p className="text-xs text-gray-500 mt-1">Also emailed to the user. They use it to complete registration.</p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm self-start"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* User role management */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold">User Roles</h3>
          <p className="text-sm text-gray-400">{users.length} users</p>
        </div>
        {loading ? (
          <p className="px-6 py-4 text-gray-400 text-sm">Loading users…</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-black/20 text-xs text-gray-500 uppercase">
              <tr><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <React.Fragment key={u.user_id}>
                  <tr className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <button onClick={() => toggle(u)} className="flex items-center gap-2 text-left">
                        {expandedId === u.user_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {u.email}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{roleLabel(u.role_id)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggle(u)} className="text-blue-400 text-sm">{expandedId === u.user_id ? 'Hide' : 'Edit role'}</button>
                    </td>
                  </tr>
                  {expandedId === u.user_id && (
                    <tr className="bg-black/30">
                      <td colSpan={3} className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                          <div className="sm:w-64">
                            <label htmlFor={`role-${u.user_id}`} className="block text-xs text-gray-500 mb-1">Change role</label>
                            <select
                              id={`role-${u.user_id}`}
                              aria-label="Change role"
                              value={chosenRole}
                              onChange={(e) => setChosenRole(Number(e.target.value))}
                              className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                            >
                              {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                          </div>
                          <button
                            onClick={() => saveRole(u.user_id)}
                            disabled={savingRole || chosenRole === u.role_id}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                          >
                            {savingRole ? 'Saving…' : 'Save'}
                          </button>
                        </div>
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
        )}
      </div>
    </div>
  );
};

export default AccessTab;
