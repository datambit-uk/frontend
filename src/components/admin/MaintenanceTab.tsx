import React, { useEffect, useState } from 'react';
import { apiCall } from '../../api/api';
import { AlertTriangle, Check } from 'lucide-react';

const MaintenanceTab: React.FC = () => {
  const [uploadsDisabled, setUploadsDisabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiCall({ endpoint: '/api/v2/auth/maintenance', jwtToken: true });
      setUploadsDisabled(Boolean(res.uploads_disabled));
      setMessage(res.message ?? '');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiCall({
        endpoint: '/api/v2/auth/maintenance',
        method: 'PUT',
        body: { uploads_disabled: uploadsDisabled, message },
        jwtToken: true,
      });
      setError(null);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <div>
          <div className="font-medium text-white">Disable file uploads</div>
          <div className="text-sm text-gray-400">
            Blocks uploads and shows a maintenance banner on the Home page for all users.
          </div>
        </div>
        <button
          data-testid="maintenance-toggle"
          onClick={() => { setUploadsDisabled((v) => !v); setSaved(false); }}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            uploadsDisabled ? 'bg-amber-500' : 'bg-gray-600'
          }`}
          aria-pressed={uploadsDisabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              uploadsDisabled ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-300">Banner message</span>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setSaved(false); }}
          rows={3}
          className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-green-400 text-sm">
            <Check size={16} /> Saved
          </span>
        )}
      </div>
    </div>
  );
};

export default MaintenanceTab;
