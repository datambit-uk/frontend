import React, { useEffect, useState } from 'react';
import { apiCall } from '../api/api';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";

interface FileStatus {
  total_files: number;
  upload_status: string;
  error_count: number;
  finished_count: number;
  pending_count: number;
}

interface RecentUpload {
  created_at: string;
  files_status: FileStatus;
  upload_id: string;
  content_type: string;
  updated_at: string;
  total_real?: number;
  total_fake?: number;
}

interface RecentUploadsResponse {
  code: string;
  message: {
    data: RecentUpload[];
    has_next: boolean;
    has_prev: boolean;
    page: number;
    per_page: number;
    total: number;
  } | null;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const localDateTime = date.toLocaleString();
  return localDateTime;
};

const RecentFileUploads: React.FC = () => {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchUploads = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      // Using recent-uploads endpoint as get-all-uploads seems to be missing/deprecated
      const res: RecentUploadsResponse = await apiCall({
        endpoint: `/api/v2/report/recent-uploads`,
        params: { page: String(pageNum), per_page: String(perPage) },
        jwtToken: true,
      });

      if (res.code === 'success' && res.message) {
        setUploads(res.message.data || []);
        setHasNext(res.message.has_next || false);
        setHasPrev(res.message.has_prev || false);
        setTotal(res.message.total || 0);
      } else {
        setUploads([]);
        if (res.code !== 'success') {
           setError('Failed to fetch uploads: ' + (res.message as any || 'Unknown error'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch uploads');
      setUploads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads(page);
    // eslint-disable-next-line
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="w-full max-w-7xl mx-auto bg-gray-900/50 rounded-2xl shadow-xl p-8 border border-gray-700/50 flex flex-col gap-4 min-h-[60vh]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold text-white">All Uploads</h2>

        {/* Pagination Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!hasPrev || page === 1}
            className={`p-2 rounded-md transition-all duration-200 ${
              !hasPrev || page === 1
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-blue-400 hover:bg-gray-800 hover:scale-105'
            }`}
            aria-label="Previous Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasNext}
            className={`p-2 rounded-md transition-all duration-200 ${
              !hasNext
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-blue-400 hover:bg-gray-800 hover:scale-105'
            }`}
            aria-label="Next Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
          />
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-16 bg-red-900/10 rounded-xl border border-red-900/20">{error}</div>
      ) : (
        <div className="overflow-x-auto bg-gray-800/30 rounded-xl border border-gray-700/50">
          <table className="min-w-full divide-y divide-gray-700/50">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Upload ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Files</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Real/Fake</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {uploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-16">No uploads found.</td>
                </tr>
              ) : (
                uploads.map((upload, idx) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={upload.upload_id}
                    className="hover:bg-gray-700/20 transition-all duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/report/${upload.upload_id}`}
                        className="text-sm font-mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {upload.upload_id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-gray-700/50 text-gray-300 capitalize">
                        {upload.content_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {upload.files_status.total_files}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                        upload.files_status.upload_status === 'complete'
                          ? 'bg-green-900/50 text-green-400'
                          : upload.files_status.upload_status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : upload.files_status.upload_status === 'processing'
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {upload.files_status.upload_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-green-400 font-bold">{upload.total_real ?? '-'}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-red-400 font-bold">{upload.total_fake ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDateTime(upload.created_at)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentFileUploads;
