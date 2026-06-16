import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { apiCall } from '../api/api';

interface FeatureGateCheckboxProps {
  featureName: string;
  label: string;
  onChange?: (enabled: boolean) => void;
}

interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;
}

type DenialReason = 'permission_denied' | 'quota_exceeded' | 'error_checking_access';

const FeatureGateCheckbox: React.FC<FeatureGateCheckboxProps> = ({
  featureName,
  label,
  onChange
}) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<DenialReason | null>(null);
  const [checked, setChecked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipMessages: Record<DenialReason, string> = {
    permission_denied: `${label} not available in your plan. Upgrade to access.`,
    quota_exceeded: 'Upload limit reached. Resets on your renewal date.',
    error_checking_access: 'Unable to verify access'
  };

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true);
        const response = await apiCall({
          endpoint: `/api/v2/auth/users/me/permissions/check`,
          method: 'GET',
          params: { feature: featureName },
          jwtToken: true
        });

        const data = response as PermissionCheckResponse;
        setAllowed(data.allowed);

        if (!data.allowed && data.reason) {
          setReason(data.reason as DenialReason);
        }
      } catch (error) {
        console.error('Error checking feature permission:', error);
        setAllowed(false);
        setReason('error_checking_access');
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [featureName]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (allowed) {
      const newValue = e.target.checked;
      setChecked(newValue);
      onChange?.(newValue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-gray-700 rounded animate-pulse" />
        <span className="text-gray-400 text-sm">{label}</span>
        <Loader2 className="h-4 w-4 text-blue-400 animate-spin ml-2" />
      </div>
    );
  }

  if (!allowed && reason) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          disabled
          checked={checked}
          className="h-4 w-4 text-blue-600 border-gray-700 rounded bg-gray-800 opacity-50 cursor-not-allowed"
          aria-disabled="true"
        />
        <label className="text-sm text-gray-400 opacity-50">
          {label}
        </label>
        <div className="relative inline-block">
          <button
            type="button"
            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label="Feature not available"
          >
            <Info className="w-3 h-3" />
          </button>
          {showTooltip && (
            <div className="absolute left-0 bottom-full mb-2 w-48 px-3 py-2 bg-gray-800 text-gray-200 text-xs rounded-md shadow-lg border border-gray-700 z-10">
              {tooltipMessages[reason]}
              <div className="absolute left-1 top-full w-2 h-2 bg-gray-800 border-r border-b border-gray-700 transform rotate-45 -ml-1" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleCheckboxChange}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors"
        aria-label={label}
      />
      <label className="text-sm text-gray-300 cursor-pointer hover:text-gray-200 transition-colors">
        {label}
      </label>
    </div>
  );
};

export default FeatureGateCheckbox;
