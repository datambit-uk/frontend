
  import React, { useState, useEffect } from "react";
  import { BarChart3, Download, Users, Files, Clock, AlertCircle } from "lucide-react";

  interface UsageStats {
    total_files: number;
    total_size_mb: number;
    total_processing_time: number;
    error_count: number;
  }

  interface Group {
    id: string;
    name: string;
  }

  const UsageDashboard: React.FC = () => {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupId, setGroupId] = useState<string>("");
    const [timeframe, setTimeframe] = useState<string>("30");

    // Use base URL from environment or fallback to relative path
    const API_URL = "https://production.datambit.com";

    useEffect(() => {
      fetchGroups();
    }, []);

    useEffect(() => {
      fetchStats();
    }, [groupId, timeframe]);

    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');
        const response = await fetch(`${API_URL}/api/v1/usage/my-groups`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setGroups(data);
          // Default to Global if found
          const globalGroup = data.find((g: Group) => g.name === 'Global');
          if (globalGroup) setGroupId(globalGroup.id);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    };

    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

        let url = `${API_URL}/api/v1/usage/stats`;
        const params = new URLSearchParams();
        if (groupId) params.append('group_id', groupId);
        if (timeframe) params.append('timeframe', timeframe);
        
        if (params.toString()) url += `?${params.toString()}`;

        console.log(`Fetching usage stats from: ${url}`);
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError("Failed to load usage statistics.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
      try {
        const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

        let url = `${API_URL}/api/v1/usage/report?format=${format}`;
        if (groupId) url += `&group_id=${groupId}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error("Export failed");

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `usage_report.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        alert("Export failed. Please try again.");
      }
    };

    if (loading && !stats) return <div className="text-center py-10">Loading usage statistics...</div>;

    return (
      <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold flex items-center gap-2">
      <BarChart3 className="text-blue-400" /> Usage Dashboard
      </h1>
      <div className="flex gap-2">
      <button
      onClick={() => handleExport('csv')}
      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm py-2 px-4 rounded transition-colors"
      >
      <Download size={16} /> CSV
      </button>
      <button
      onClick={() => handleExport('pdf')}
      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm py-2 px-4 rounded transition-colors"
      >
      <Download size={16} /> PDF
      </button>
      </div>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard
      icon={<Files className="text-blue-400" />}
      label="Total Files"
      value={stats?.total_files || 0}
      />
      <StatCard
      icon={<Users className="text-green-400" />}
      label="Data Processed"
      value={`${stats?.total_size_mb?.toFixed(2) || '0.00'} MB`}
      />
      <StatCard
      icon={<Clock className="text-purple-400" />}
      label="Processing Time"
      value={`${stats?.total_processing_time?.toFixed(2) || '0.00'}s`}
      />
      <StatCard
      icon={<AlertCircle className="text-red-400" />}
      label="Errors"
      value={stats?.error_count || 0}
      />
      </div>

      <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Group Insights</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase font-bold">Select Group</label>
      <select
      className="bg-black/40 border border-gray-700 rounded px-4 py-2 text-sm w-64 focus:outline-none focus:border-blue-500 text-white"
      value={groupId}
      onChange={(e) => setGroupId(e.target.value)}
      >
      <option value="">My Individual Usage</option>
      {groups.map(group => (
        <option key={group.id} value={group.id}>{group.name}</option>
      ))}
      </select>
      </div>

      <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase font-bold">Timeframe</label>
      <select
      className="bg-black/40 border border-gray-700 rounded px-4 py-2 text-sm w-64 focus:outline-none focus:border-blue-500 text-white"
      value={timeframe}
      onChange={(e) => setTimeframe(e.target.value)}
      >
      <option value="0">Current Month</option>
      <option value="30">Last 30 Days</option>
      <option value="60">Last 60 Days</option>
      <option value="90">Last 90 Days</option>
      </select>
      </div>

      <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase font-bold">Manual Group ID</label>
      <input
      type="text"
      placeholder="Enter Group ID..."
      className="bg-black/40 border border-gray-700 rounded px-4 py-2 text-sm w-64 focus:outline-none focus:border-blue-500"
      value={groupId}
      onChange={(e) => setGroupId(e.target.value)}
      />
      </div>
      </div>

      <div className="text-gray-400 text-sm">
      <p>Detailed breakdown and graphs will appear here as more data is collected.</p>
      <div className="mt-4 h-32 bg-black/20 rounded flex items-end p-4 gap-2">
      {/* Simple CSS bar chart visualization placeholder */}
      <div className="bg-blue-600/50 w-full h-[30%] rounded-t"></div>
      <div className="bg-blue-600/50 w-full h-[60%] rounded-t"></div>
      <div className="bg-blue-600/50 w-full h-[45%] rounded-t"></div>
      <div className="bg-blue-600/50 w-full h-[80%] rounded-t"></div>
      <div className="bg-blue-600/50 w-full h-[55%] rounded-t"></div>
      </div>
      </div>
      </div>
      </div>
    );
  };

  const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-sm text-gray-400">
    {icon} {label}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    </div>
  );

  export default UsageDashboard;
