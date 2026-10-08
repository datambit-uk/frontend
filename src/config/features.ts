/**
 * Detection feature catalog — IDs match upload `features` JSON.
 * Auth columns may differ for aliased features (see authColumn).
 *
 * obvious_precheck is intentionally excluded: disabled on cloud API until
 * the feature shows promising results.
 */

export type FeatureId =
  | "heatmaps"
  | "audio_importance"
  | "gemini_reasoning"
  | "gemini_heatmap_audit";

export interface FeatureDef {
  id: FeatureId;
  /** UserScope / permissions field name */
  authColumn: string;
  label: string;
  description: string;
  /** Default when the user is entitled */
  defaultOn: boolean;
  /** Optional badge next to the label */
  badge?: string;
}

export const FEATURE_CATALOG: FeatureDef[] = [
  {
    id: "heatmaps",
    authColumn: "heatmaps",
    label: "Generate Heatmap",
    description:
      "Visualise engagement hotspots using our proprietary AI models",
    defaultOn: false,
    badge: "Takes Longer",
  },
  {
    id: "audio_importance",
    authColumn: "audio_transcription",
    label: "Audio Importance",
    description: "Transcribe and score spoken content for deepfake cues",
    defaultOn: false,
  },
  {
    id: "gemini_reasoning",
    authColumn: "reasoning",
    label: "AI Reasoning",
    description: "Gemini metadata reasoning over detection signals",
    defaultOn: false,
  },
  {
    id: "gemini_heatmap_audit",
    authColumn: "gemini_heatmap_audit",
    label: "Heatmap Audit",
    description: "Attach heatmap frames to Gemini reasoning when heatmaps run",
    defaultOn: false,
  },
];

export type FeatureSelection = Record<FeatureId, boolean>;

export function emptyFeatureSelection(): FeatureSelection {
  return {
    heatmaps: false,
    audio_importance: false,
    gemini_reasoning: false,
    gemini_heatmap_audit: false,
  };
}

/** Build selection from auth permissions payload (message object). */
export function selectionFromPermissions(
  permissions: Record<string, unknown> | null | undefined
): { entitled: FeatureSelection; selected: FeatureSelection } {
  const entitled = emptyFeatureSelection();
  const selected = emptyFeatureSelection();
  if (!permissions) {
    return { entitled, selected };
  }
  for (const def of FEATURE_CATALOG) {
    const allowed = Boolean(permissions[def.authColumn]);
    entitled[def.id] = allowed;
    selected[def.id] = allowed && def.defaultOn;
  }
  return { entitled, selected };
}

export function featuresPayload(selected: FeatureSelection): FeatureSelection {
  return { ...selected };
}
