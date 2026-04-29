import React, { useState } from "react";
import { Shield, Upload, Play, History, CheckCircle, XCircle, Clock, Smartphone, Database, AlertCircle, RefreshCw } from "lucide-react";

interface PhoneHomeResponse {
  valid: boolean;
  subscription_active: boolean;
  expires_at: string;
  video_limit: number;
  audio_limit: number;
  message: string;
}

interface CallLogEntry {
  timestamp: string;
  fingerprint: string;
  video_count: number;
  audio_count: number;
  valid: boolean;
  subscription_active: boolean;
  expires_at: string;
}

const LicenseTestDashboard: React.FC = () => {
  const [licenseJson, setLicenseJson] = useState("");
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [activeLicenseId, setActiveLicenseId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState("fp_test_device_001");
  const [videoCount, setVideoCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<PhoneHomeResponse | null>(null);
  const [history, setHistory] = useState<CallLogEntry[]>([]);

  // Fixed path: prefix is /api/v1/usage, not /api/v1/licensing
  const API_URL = "https://production.datambit.com";
  const ENDPOINT_PREFIX = "/api/v1/usage";

  const fetchLicenses = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API_URL}${ENDPOINT_PREFIX}/licenses`);
      if (!response.ok) throw new Error("Failed to fetch licenses");
      const data = await response.json();
      setAvailableLicenses(data);
      if (data.length > 0 && !activeLicenseId) {
        setActiveLicenseId(data[0].license_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  React.useEffect(() => {
    fetchLicenses();
  }, []);

  const handleLoadLicense = () => {
    try {
      const parsed = JSON.parse(licenseJson);
      
      // Support both flat response from GET /licenses and nested generator output
      const licenseId = parsed.license_id || (parsed.license && parsed.license.license_id);
      
      if (!licenseId) {
        throw new Error("Missing license_id in JSON (checked root and .license.license_id)");
      }
      
      setActiveLicenseId(licenseId);
      setError(null);
      alert(`License ID '${licenseId}' loaded into dashboard state.`);
    } catch (err) {
      setError(`Load failed: ${err instanceof Error ? err.message : "Invalid JSON format"}`);
    }
  };

  const syncLicenseToDb = async () => {
    try {
      const parsed = JSON.parse(licenseJson);
      setSyncing(true);
      setError(null);

      // The backend store_license expects { "license": {...}, "signature": "..." }
      // If user pasted a flat response, we might need to wrap it, but usually 
      // they should paste the generator output for a new sync.
      const payload = parsed.license ? parsed : { license: parsed, signature: parsed.signature || "MOCK_SIG" };

      const response = await fetch(`${API_URL}${ENDPOINT_PREFIX}/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);

      setActiveLicenseId(result.license_id);
      fetchLicenses(); // Refresh the dropdown
      alert(`Successfully synced license ${result.license_id} to database.`);
    } catch (err) {
      setError(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const sendPhoneHomeRequest = async () => {
    if (!activeLicenseId) {
      setError("Please 'load' or 'sync' a license first.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      license_id: activeLicenseId,
      fingerprint,
      video_count: videoCount,
      audio_count: audioCount,
      client_version: "1.0.0-test-dashboard",
      reported_at: new Date().toISOString()
    };

    try {
      // Corrected endpoint path
      const response = await fetch(`${API_URL}${ENDPOINT_PREFIX}/phone-home`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP Error: ${response.status}`);
      }

      const result: PhoneHomeResponse = await response.json();
      setLastResponse(result);

      // Add to history
      const newEntry: CallLogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        fingerprint,
        video_count: videoCount,
        audio_count: audioCount,
        valid: result.valid,
        subscription_active: result.subscription_active,
        expires_at: result.expires_at
      };
      setHistory(prev => [newEntry, ...prev]);

    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-8 max-w-7xl mx-auto bg-black text-white min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Shield className="text-blue-500" size={32} />
          Phone-Home License Validation Test Dashboard
        </h1>
        <div className="text-xs font-mono text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
          v1.0.2-alpha
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Simulation */}
        <div className="flex flex-col gap-6">
          {/* Section 1: Upload/Paste License */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload size={18} className="text-blue-400" /> 1. Load License JSON
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Paste the JSON output from <code>vendor_license_generator.py</code> or a database export.
            </p>
            <textarea
              className="w-full h-48 bg-black border border-gray-700 rounded-lg p-4 font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              placeholder='{ "license_id": "sub_acme_001", ... }'
              value={licenseJson}
              onChange={(e) => setLicenseJson(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleLoadLicense}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-700"
              >
                <Database size={16} /> Load Local ID
              </button>
              <button
                onClick={syncLicenseToDb}
                disabled={syncing || !licenseJson}
                className="flex-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-100 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border border-blue-800/50 disabled:opacity-50"
              >
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
                Sync to Database
              </button>
            </div>
          </div>

          {/* Section 2: Simulate Request */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Play size={18} className="text-green-400" /> 2. Simulate Phone-Home
              </h2>
              <button 
                onClick={fetchLicenses}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                disabled={fetching}
              >
                <RefreshCw size={12} className={fetching ? "animate-spin" : ""} /> Refresh List
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">Select License ID</label>
                {availableLicenses.length > 0 ? (
                  <select
                    value={activeLicenseId || ""}
                    onChange={(e) => setActiveLicenseId(e.target.value)}
                    className="bg-black border border-gray-700 rounded px-4 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                  >
                    {availableLicenses.map(lic => (
                      <option key={lic.id} value={lic.license_id}>
                        {lic.license_id} ({lic.customer})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={activeLicenseId || "None in DB - Please Load/Sync"}
                    className="bg-black border border-gray-800 rounded px-4 py-2 text-sm text-gray-500 font-mono"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">Fingerprint (Device Hash)</label>
                <div className="flex gap-2">
                  <div className="bg-gray-800 p-2 rounded text-gray-400">
                    <Smartphone size={16} />
                  </div>
                  <input
                    type="text"
                    value={fingerprint}
                    onChange={(e) => setFingerprint(e.target.value)}
                    className="bg-black border border-gray-700 rounded px-4 py-2 text-sm flex-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">Video Count</label>
                <input
                  type="number"
                  value={videoCount}
                  onChange={(e) => setVideoCount(parseInt(e.target.value) || 0)}
                  className="bg-black border border-gray-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">Audio Count</label>
                <input
                  type="number"
                  value={audioCount}
                  onChange={(e) => setAudioCount(parseInt(e.target.value) || 0)}
                  className="bg-black border border-gray-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={sendPhoneHomeRequest}
              disabled={loading || !activeLicenseId}
              className={`mt-6 w-full font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                loading || !activeLicenseId 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Play size={18} fill="currentColor" /> Send Phone-Home Request
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-800 text-red-200 p-3 rounded flex items-center gap-2 text-sm animate-pulse">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Response & History */}
        <div className="flex flex-col gap-6">
          {/* Section 3: Latest Response */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 shadow-sm min-h-[300px]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History size={18} className="text-purple-400" /> Latest Response
            </h2>
            {lastResponse ? (
              <div className="flex flex-col gap-4">
                <div className={`p-4 rounded-lg border flex items-center gap-4 ${
                  lastResponse.valid && lastResponse.subscription_active 
                    ? "bg-green-900/20 border-green-800 text-green-400" 
                    : "bg-red-900/20 border-red-800 text-red-400"
                }`}>
                  {lastResponse.valid && lastResponse.subscription_active ? (
                    <CheckCircle size={32} />
                  ) : (
                    <XCircle size={32} />
                  )}
                  <div>
                    <div className="font-bold text-lg">
                      {lastResponse.subscription_active ? "Subscription Active" : "Access Denied"}
                    </div>
                    <div className="text-sm opacity-80">{lastResponse.message}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ResponseField label="Signature Valid" value={lastResponse.valid ? "YES" : "NO"} highlight={lastResponse.valid} />
                  <ResponseField label="Expires At" value={lastResponse.expires_at || "N/A"} />
                  <ResponseField label="Video Limit" value={lastResponse.video_limit} />
                  <ResponseField label="Audio Limit" value={lastResponse.audio_limit} />
                </div>

                <div className="mt-2">
                  <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Raw JSON Response</label>
                  <pre className="bg-black p-3 rounded border border-gray-800 text-[10px] text-gray-400 overflow-x-auto">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-gray-600 italic">
                No requests sent yet
              </div>
            )}
          </div>

          {/* Section 4: Call History */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden shadow-sm flex-1">
            <div className="p-4 border-b border-gray-800 bg-gray-900/80">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock size={16} /> Request History
              </h2>
            </div>
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-gray-500 uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Video/Audio</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-600">No history available</td>
                    </tr>
                  ) : (
                    history.map((entry, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-gray-400">{entry.timestamp}</td>
                        <td className="px-4 py-3 font-mono">
                          {entry.video_count}v / {entry.audio_count}a
                        </td>
                        <td className="px-4 py-3">
                          {entry.subscription_active ? (
                            <span className="text-green-500 flex items-center gap-1">
                              <CheckCircle size={12} /> Active
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-1">
                              <XCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{entry.expires_at.split('T')[0]}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponseField: React.FC<{ label: string, value: string | number, highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="bg-black/40 p-3 rounded border border-gray-800">
    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</div>
    <div className={`text-sm font-mono ${highlight ? "text-blue-400" : "text-gray-300"}`}>{value}</div>
  </div>
);

export default LicenseTestDashboard;
