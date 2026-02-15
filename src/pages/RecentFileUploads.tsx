import React, { useEffect, useState } from 'react';
import { apiCall } from '../api/api';
import { useNavigate } from 'react-router-dom';

interface FileMetadata {
  content_type: string;
  filename: string;
  size: number;
}

interface AudioResult {
  label_audio: string;
  score_audio: number;
}

interface ImageResult {
  label_image: string;
  score_image: number;
}

interface VideoResult {
  label_video: string;
  score_video: number;
}

interface FileResult {
  audio_result: AudioResult | null;
  image_result: ImageResult | null;
  video_result: VideoResult | null;
  heatmap_url: string[];
}

interface RecentUpload {
  file_metadata: FileMetadata;
  file_status: string;
  result: FileResult | null;
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
  };
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const RecentFileUploads: React.FC = () => {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchUploads = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res: RecentUploadsResponse = await apiCall({
        endpoint: `/api/v2/report/get-all-uploads`,
        params: { page: String(pageNum), per_page: String(perPage) },
        jwtToken: true,
      });
      if (res && res.message && Array.isArray(res.message.data)) {
        setUploads(res.message.data);
        setHasNext(res.message.has_next);
        setHasPrev(res.message.has_prev);
        setTotal(res.message.total);
      } else {
        setError('Unexpected API response structure or no data available.');
        setUploads([]); // Ensure uploads array is empty
        setHasNext(false);
        setHasPrev(false);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch uploads');
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
    <div className="w-full max-w-7xl mx-auto bg-gray-800/90 rounded-2xl shadow-xl p-8 border border-gray-700/50 flex flex-col gap-4 min-h-[60vh]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-200">All Uploads</h2>
        {/* Pagination Controls at the top, styled like ReportPage */}
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
          <span className="text-sm text-gray-400 ml-2">Page {page} of {totalPages}</span>
        </div>
      </div>
      {loading ? (
        <div className="text-center text-blue-400 py-8">Loading recent uploads...</div>
      ) : error ? (
        <div className="text-center text-red-400 py-8">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700/50">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Filename</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {uploads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">No uploads found.</td>
                </tr>
              ) : (
                uploads.map((upload, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/20 transition-all duration-200">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-300 max-w-[320px] truncate" title={upload.file_metadata.filename}>{upload.file_metadata.filename}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{capitalizeFirst(upload.file_metadata.content_type)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{formatFileSize(upload.file_metadata.size)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                        upload.file_status === 'complete'
                          ? 'bg-green-900/50 text-green-400'
                          : upload.file_status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : upload.file_status === 'processing'
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {capitalizeFirst(upload.file_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        {upload.result ? (
                          upload.result.audio_result ? (
                            <span className={upload.result.audio_result.label_audio === 'real' ? 'text-green-400' : 'text-red-400'}>
                              {capitalizeFirst(upload.result.audio_result.label_audio)}
                            </span>
                          ) : upload.result.video_result ? (
                            <span className={upload.result.video_result.label_video === 'real' ? 'text-green-400' : 'text-red-400'}>
                              {capitalizeFirst(upload.result.video_result.label_video)}
                            </span>
                          ) : upload.result.image_result ? (
                            <span className={upload.result.image_result.label_image === 'real' ? 'text-green-400' : 'text-red-400'}>
                              {capitalizeFirst(upload.result.image_result.label_image)}
                            </span>
                          ) : (
                            <span className="text-gray-400">No result</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {/* Analysis Button */}
                        {upload.result && upload.result.heatmap_url && upload.result.heatmap_url.length > 0 && (
                          <button
                            onClick={() => {
                              const result = upload.result!;
                              const analysisData = {
                                upload_id: upload.file_metadata.filename.split('_')[1] || '', // fallback if no upload_id
                                filename: upload.file_metadata.filename,
                                content_type: upload.file_metadata.content_type,
                                size: upload.file_metadata.size,
                                heatmap_urls: result.heatmap_url,
                                label_audio: result.audio_result?.label_audio || null,
                                score_audio: result.audio_result?.score_audio || null,
                                label_video: result.video_result?.label_video || null,
                                score_video: result.video_result?.score_video || null,
                                label_image: result.image_result?.label_image || null,
                                score_image: result.image_result?.score_image || null
                              };
                              navigate('/analysis', { state: analysisData });
                            }}
                            className="ml-2 p-1 text-blue-400 hover:text-blue-300 hover:bg-gray-700/50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="View Heatmap"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Remove pagination from the bottom */}
    </div>
  );
};

export default RecentFileUploads;
