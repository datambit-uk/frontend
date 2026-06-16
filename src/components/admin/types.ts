// Shared types for the Admin Console tabs.

// Auth-service `roles` table. Single source of truth for role dropdowns/labels.
export const ROLE_OPTIONS = [
  { id: 4, label: 'Admin' },
  { id: 5, label: 'User' },
  { id: 6, label: 'Internal' },
  { id: 7, label: 'Tester' },
  { id: 8, label: 'Dev' },
  { id: 10, label: 'Black Label' },
] as const;

export const roleLabel = (id: number | null | undefined): string =>
  id == null ? '—' : (ROLE_OPTIONS.find((r) => r.id === id)?.label ?? `Role ${id}`);

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  created_by?: string;
  created_at?: string | null;
}

export interface TemplateDetail extends TemplateSummary {
  video_model_1: boolean;
  video_model_2: boolean;
  audio_detection: boolean;
  audio_transcription: boolean;
  reasoning: boolean;
  max_file_size_mb: number | null;
  max_uploads_per_day: number | null;
  max_uploads_per_month: number | null;
}

export interface Group {
  id: string;
  name: string;
  domain: string | null;
  is_auto_domain: boolean;
  created_at: string;
}

export interface Member {
  user_id: string;
  is_group_admin: boolean;
  joined_at: string;
}

export interface GroupTemplateInfo {
  group_id: string;
  template_id: string;
  template_name: string | null;
  assigned_at: string | null;
}

export interface UserRow {
  user_id: string;
  email: string;
  role_id: number | null;
}

export interface OverrideInfo {
  user_id: string;
  template_id: string;
  template_name: string | null;
  override_reason: string | null;
  assigned_at: string | null;
}

export interface Scope {
  template_id?: string;
  video_model_1: boolean;
  video_model_2: boolean;
  audio_detection: boolean;
  audio_transcription: boolean;
  reasoning: boolean;
  max_file_size_mb: number | null;
  max_uploads_per_day: number | null;
  max_uploads_per_month: number | null;
  uploads_today?: number;
  uploads_month?: number;
  gb_used_month?: number;
  uploads_remaining_month?: number | null;
}
