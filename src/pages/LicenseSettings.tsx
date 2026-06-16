import React, { useState, useEffect } from 'react';
import { apiCall } from '../api/api';
import { AlertCircle, RefreshCw, Check, X } from 'lucide-react';

// Shape returned by GET /api/v2/auth/users/me/license (inside response.message).
// Matches authentication-service PermissionController.get_user_license.
interface LicenseResponse {
  license_id: string;
  expires_at: string | null;
  subscription_active: boolean;
  permissions: {
    video_model_1: boolean;
    video_model_2: boolean;
    audio_detection: boolean;
    audio_transcription: boolean;
    reasoning: boolean;
  };
  usage_this_month: {
    uploads_used: number | null;
    uploads_limit: number | null;
    uploads_remaining: number | null;
    gb_used: number | null;
    max_file_size_mb: number | null;
  };
  next_reset_date: string | null;
}

// Internal view model the component renders.
interface FeatureView {
  name: string;
  available: boolean;
}

interface LicenseView {
  licenseId: string;
  expiryDate: string | null;
  status: 'Active' | 'Expired';
  uploadsUsed: number;
  uploadsLimit: number | null;
  gbUsed: number;
  maxFileSizeMb: number | null;
  features: FeatureView[];
  resetDate: string | null;
}

// Map the backend permission/license payload into the view model.
// Defensive: backend may send nulls for quotas the user has no limit on.
const normalizeLicense = (data: LicenseResponse): LicenseView => {
  const perms = data.permissions ?? ({} as LicenseResponse['permissions']);
  const usage = data.usage_this_month ?? ({} as LicenseResponse['usage_this_month']);

  return {
    licenseId: data.license_id,
    expiryDate: data.expires_at ?? null,
    status: data.subscription_active ? 'Active' : 'Expired',
    uploadsUsed: usage.uploads_used ?? 0,
    uploadsLimit: usage.uploads_limit ?? null,
    gbUsed: usage.gb_used ?? 0,
    maxFileSizeMb: usage.max_file_size_mb ?? null,
    resetDate: data.next_reset_date ?? null,
    features: [
      { name: 'Video Processing', available: !!(perms.video_model_1 || perms.video_model_2) },
      { name: 'Audio Processing', available: !!perms.audio_detection },
      { name: 'Transcription', available: !!perms.audio_transcription },
      { name: 'Reasoning', available: !!perms.reasoning },
    ],
  };
};

const LicenseSettings: React.FC = () => {
  const [license, setLicense] = useState<LicenseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLicenseData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await apiCall({
        endpoint: '/api/v2/auth/users/me/license',
        method: 'GET',
        jwtToken: true,
      });

      if (response.code === 'success' && response.message) {
        setLicense(normalizeLicense(response.message as LicenseResponse));
      } else {
        setError('Failed to fetch license data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load license information');
      console.error('License fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLicenseData();
  }, []);

  const calculatePercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading license information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">License & Usage Settings</h1>
        <button
          onClick={fetchLicenseData}
          disabled={refreshing}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-3 border border-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {license && (
        <>
          {/* License Status Section */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">License Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">License ID</p>
                <p className="text-lg font-mono text-gray-200 break-all">{license.licenseId}</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Expiry Date</p>
                <p className="text-lg font-semibold text-gray-200">
                  {license.expiryDate ? formatDate(license.expiryDate) : 'No expiry'}
                </p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Status</p>
                <p className={`text-lg font-semibold flex items-center gap-2 ${
                  license.status === 'Active' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {license.status === 'Active' ? <Check size={18} /> : <X size={18} />}
                  {license.status}
                </p>
              </div>
            </div>
            <div className="mt-4 bg-gray-800/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Reset Date</p>
              <p className="text-gray-200">{formatDate(license.resetDate)}</p>
            </div>
          </div>

          {/* Usage Progress Section */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6">Usage Progress</h2>

            {/* Uploads Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-300">Uploads</p>
                <p className="text-sm font-mono text-gray-400">
                  {license.uploadsLimit !== null
                    ? `${license.uploadsUsed} / ${license.uploadsLimit}`
                    : `${license.uploadsUsed} (no limit)`}
                </p>
              </div>
              {license.uploadsLimit !== null && (
                <>
                  <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden border border-gray-700">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${calculatePercentage(license.uploadsUsed, license.uploadsLimit)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {calculatePercentage(license.uploadsUsed, license.uploadsLimit).toFixed(1)}% used
                  </p>
                </>
              )}
            </div>

            {/* Data + file size stats (backend does not return a GB limit) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Data Processed</p>
                <p className="text-lg font-semibold text-gray-200">{license.gbUsed.toFixed(2)} GB</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Max File Size</p>
                <p className="text-lg font-semibold text-gray-200">
                  {license.maxFileSizeMb !== null ? `${license.maxFileSizeMb} MB` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Feature Access Section */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Feature Access</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-xs font-bold text-gray-500 uppercase py-3 px-4">Feature</th>
                    <th className="text-left text-xs font-bold text-gray-500 uppercase py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {license.features.map((feature) => (
                    <FeatureRow key={feature.name} name={feature.name} available={feature.available} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface FeatureRowProps {
  name: string;
  available: boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ name, available }) => (
  <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
    <td className="py-3 px-4 text-sm text-gray-300">{name}</td>
    <td className="py-3 px-4 text-sm">
      {available ? (
        <div className="flex items-center gap-2 text-green-400">
          <Check size={16} />
          <span>Available</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-400">
          <X size={16} />
          <span>Unavailable</span>
        </div>
      )}
    </td>
  </tr>
);

export default LicenseSettings;
