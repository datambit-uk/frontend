import React, { useEffect, useState } from 'react';
import { apiCall } from '../../api/api';
import { PlusCircle, Edit, Trash2, AlertCircle } from 'lucide-react';
import { TemplateSummary, TemplateDetail } from './types';

const FEATURE_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'video_model_1', label: 'Video Model 1' },
  { key: 'video_model_2', label: 'Video Model 2' },
  { key: 'audio_detection', label: 'Audio Detection' },
  { key: 'audio_transcription', label: 'Audio Transcription' },
  { key: 'reasoning', label: 'Reasoning' },
];

const QUOTA_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'max_file_size_mb', label: 'Max File Size (MB)' },
  { key: 'max_uploads_per_day', label: 'Max Uploads Per Day' },
  { key: 'max_uploads_per_month', label: 'Max Uploads Per Month' },
];

interface FormState {
  name: string;
  description: string;
  video_model_1: boolean;
  video_model_2: boolean;
  audio_detection: boolean;
  audio_transcription: boolean;
  reasoning: boolean;
  max_file_size_mb: string;
  max_uploads_per_day: string;
  max_uploads_per_month: string;
}

const emptyForm: FormState = {
  name: '', description: '',
  video_model_1: false, video_model_2: false, audio_detection: false,
  audio_transcription: false, reasoning: false,
  max_file_size_mb: '', max_uploads_per_day: '', max_uploads_per_month: '',
};

const toNum = (s: string): number | null => (s.trim() === '' ? null : Number(s));

const TemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiCall({ endpoint: '/api/v2/auth/templates', jwtToken: true });
      setTemplates(res.message?.templates ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = async (id: string) => {
    try {
      const res = await apiCall({ endpoint: `/api/v2/auth/templates/${id}`, jwtToken: true });
      const t: TemplateDetail = res.message;
      setForm({
        name: t.name, description: t.description,
        video_model_1: t.video_model_1, video_model_2: t.video_model_2,
        audio_detection: t.audio_detection, audio_transcription: t.audio_transcription,
        reasoning: t.reasoning,
        max_file_size_mb: t.max_file_size_mb?.toString() ?? '',
        max_uploads_per_day: t.max_uploads_per_day?.toString() ?? '',
        max_uploads_per_month: t.max_uploads_per_month?.toString() ?? '',
      });
      setEditingId(id);
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description) {
      setError('Name and description are required');
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      video_model_1: form.video_model_1,
      video_model_2: form.video_model_2,
      audio_detection: form.audio_detection,
      audio_transcription: form.audio_transcription,
      reasoning: form.reasoning,
      max_file_size_mb: toNum(form.max_file_size_mb),
      max_uploads_per_day: toNum(form.max_uploads_per_day),
      max_uploads_per_month: toNum(form.max_uploads_per_month),
    };
    try {
      if (editingId) {
        await apiCall({ endpoint: `/api/v2/auth/templates/${editingId}`, method: 'PUT', body: payload, jwtToken: true });
      } else {
        await apiCall({ endpoint: '/api/v2/auth/templates', method: 'POST', body: payload, jwtToken: true });
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await apiCall({ endpoint: `/api/v2/auth/templates/${id}`, method: 'DELETE', jwtToken: true });
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading templates...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Templates</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg">
          <PlusCircle size={18} /> New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{t.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => openEdit(t.id)} className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg"><Edit size={16} /></button>
                <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-400">{t.description}</p>
          </div>
        ))}
        {templates.length === 0 && <p className="text-gray-500">No templates yet.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Template' : 'Create Template'}</h2>

            <label className="block text-xs text-gray-500 uppercase font-bold mb-1" htmlFor="tpl-name">Name</label>
            <input id="tpl-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-blue-500" />

            <label className="block text-xs text-gray-500 uppercase font-bold mb-1" htmlFor="tpl-desc">Description</label>
            <input id="tpl-desc" type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-black border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-blue-500" />

            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Features</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {FEATURE_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form[f.key] as boolean} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="w-4 h-4" />
                  {f.label}
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Quotas</p>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {QUOTA_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor={`q-${f.key}`}>{f.label}</label>
                  <input id={`q-${f.key}`} type="number" value={form[f.key] as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">{editingId ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesTab;
