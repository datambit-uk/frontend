// Maintenance mode — backend-backed global setting.
// Source of truth: GET /api/v2/auth/maintenance (public).
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '../api/api';

export interface MaintenanceState {
  uploadsDisabled: boolean;
  message: string;
}

const FALLBACK_MESSAGE =
  'Uploads are temporarily disabled while we perform a system update. Please try again in a few minutes.';

export async function fetchMaintenance(): Promise<MaintenanceState> {
  const res = await apiCall({ endpoint: '/api/v2/auth/maintenance' });
  return {
    uploadsDisabled: Boolean(res.uploads_disabled),
    message: res.message || FALLBACK_MESSAGE,
  };
}

export function useMaintenance() {
  const [uploadsDisabled, setUploadsDisabled] = useState(false);
  const [message, setMessage] = useState(FALLBACK_MESSAGE);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const state = await fetchMaintenance();
      setUploadsDisabled(state.uploadsDisabled);
      setMessage(state.message);
    } catch {
      // Fail open: a backend hiccup must not hide the uploader.
      setUploadsDisabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    window.addEventListener('focus', refetch);
    return () => window.removeEventListener('focus', refetch);
  }, [refetch]);

  return { uploadsDisabled, message, loading, refetch };
}
