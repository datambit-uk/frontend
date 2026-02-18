import React, { useState, useEffect, useCallback, useRef, ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from "../api/api";
import { motion } from 'framer-motion';

interface FileMetadata {
  content_type: string;
  filename: string;
  size: number;
}

interface VideoAnalysis {
  error: string | null;
  verdict: string;
  predicted_class: string;
  fake_confidence: number;
  real_confidence: number;
  processing_time: number;
  avg_inference_ms: number;
  heatmap_paths?: string[] | null;
  faces_detected?: number;
  frames_analyzed?: number;
  class_confidences?: Record<string, number>;
  predicted_class_idx?: number;
  score_video?: number;
}

interface AudioAnalysis {
  error: string | null;
  verdict: string;
  fake_confidence: number;
  real_confidence: number;
  processing_time: number;
  avg_inference_ms: number;
  duration?: number;
  audio_path?: string;
  score_audio?: number;
}

interface ImageResult {
  label_image: string;
  score_image?: number;
}

interface Result {
  // Flat DB columns
  id?: string;
  file_upload_id?: string;
  created_at?: string;
  updated_at?: string;
  verdict?: string;
  real_confidence?: number;
  fake_confidence?: number;
  heatmap_paths?: string[] | null;
  predicted_class?: string | null;
  processing_time?: number;
  avg_inference_ms?: number;
  // Nested analysis objects
  video_analysis: VideoAnalysis | null;
  audio_analysis: AudioAnalysis | null;
  image_result: ImageResult | null;
  heatmap_url: string[] | null;
}

interface FileUpload {
  file_metadata: FileMetadata;
  file_status: string;
  result: Result | null;
}

interface ReportDetailResponse {
  code: string;
  message: {
    file_uploads: FileUpload[];
  };
}

const ReportDetail: React.FC = () => {
  const { uploadId, contentType: urlContentType } = useParams<{ uploadId: string; contentType?: string }>();
  const [data, setData] = useState<FileUpload[]>([]);
  const [contentType, setContentType] = useState<string | undefined>(urlContentType);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessingItems, setHasProcessingItems] = useState<boolean>(false);
  const pollingInterval = useRef<number | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds
  const navigate = useNavigate();

  const handleBackToReport = () => {
    navigate(-1);
  };

  // Check if any items are in processing state
  const checkForProcessingItems = useCallback((items: FileUpload[]) => {
    return items.some(item => item.file_status === 'processing');
  }, []);

  // Clear polling interval
  const clearPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  const fetchReportDetail = useCallback(async () => {
    setLoading(true); // Always set loading true on fetch start
    setError(null);
    try {
      const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

      if (!token) {
        alert("Authentication token missing. Please log in again.");
        setData([]);
        setHasProcessingItems(false);
        setLoading(false); // Set loading to false on error
        return;
      }

      const url = `/api/v2/report/${uploadId}`;

      const result: ReportDetailResponse = await apiCall({
        endpoint: url,
        method: 'GET',
        jwtToken: true
      });
      console.log('API Response for Report Detail:', result);


      if (result.code === 'success' && result.message && Array.isArray(result.message.file_uploads) && result.message.file_uploads.length > 0) {
        // If no content type is provided in URL, determine it from the first file with results
        if (!contentType) {
          const fileWithResults = result.message.file_uploads.find(upload => {
            if (upload.result) {
              if (upload.result.audio_analysis !== null) return true;
              if (upload.result.image_result !== null) return true;
              if (upload.result.video_analysis !== null) return true;
            }
            return false;
          });

          if (fileWithResults) {
            const newContentType = fileWithResults.file_metadata.content_type.toLowerCase();
            setContentType(newContentType);
            // Update URL without reloading
            navigate(`/report/${uploadId}/${newContentType}`, { replace: true });
          }
        }

        const filteredUploads = result.message.file_uploads.filter(upload => {
          // Always show files that are processing or have errors
          if (upload.file_status === 'processing' || upload.file_status === 'error') {
            return true;
          }

          // For completed files, show them if they match the content type
          if (upload.file_status === 'complete') {
            const fileContentType = upload.file_metadata.content_type.toLowerCase();
            if (contentType === 'audio' && fileContentType.includes('audio')) {
              return true;
            } else if (contentType === 'image' && fileContentType.includes('image')) {
              return true;
            } else if (contentType === 'video' && (fileContentType.includes('video') || fileContentType.includes('audio'))) { // Handle video files that might also have audio
              return true;
            } else if (contentType === undefined) { // If no specific content type is set, show all results that have some analysis
              return upload.result?.audio_analysis || upload.result?.image_result || upload.result?.video_analysis;
            }
          }
          return false;
        });

        setData(filteredUploads);

        // Check for processing items in the new data
        const hasProcessing = checkForProcessingItems(filteredUploads);
        setHasProcessingItems(hasProcessing);
      } else {
        setData([]);
        setHasProcessingItems(false);
      }
    } catch (err: unknown) { // Changed to unknown
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setData([]);
      setHasProcessingItems(false);
    } finally {
      setLoading(false);
    }
  }, [uploadId, contentType, navigate, checkForProcessingItems]);

  // Setup polling if needed
  const setupPolling = useCallback(() => {
    if (hasProcessingItems && !pollingInterval.current) {
      pollingInterval.current = setInterval(() => {
        fetchReportDetail();
      }, POLL_INTERVAL);
    } else if (!hasProcessingItems) {
      clearPolling();
    }
  }, [hasProcessingItems, clearPolling, fetchReportDetail]);

  // Effect for initial fetch and cleanup
  useEffect(() => {
    fetchReportDetail();
    return () => clearPolling();
  }, [uploadId, contentType, clearPolling, fetchReportDetail]); // Add fetchReportDetail to dependencies

  // Effect for polling setup
  useEffect(() => {
    setupPolling();
    return () => clearPolling();
  }, [hasProcessingItems, setupPolling, clearPolling]);

  // Moved outside the component
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatResult = (upload: FileUpload) => {
    // Helper function to get label color
    const getLabelColor = (label: string | undefined | null) => {
      if (!label) return 'text-gray-400';
      const lowerLabel = label.toLowerCase();
      if (lowerLabel === 'real') return 'text-green-400';
      if (lowerLabel === 'fake') return 'text-red-400';
      return 'text-gray-400';
    };

    const capitalizeFirst = (str: string | undefined | null) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const formatClassName = (cls: string | undefined | null) => {
      if (!cls) return 'N/A';
      return cls.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    if (upload.file_status === 'error') {
      return (
        <div>
        <span className="font-semibold text-red-400">Error:</span>
        <br />
        <span className="text-xs text-red-400">Failed to process file</span>
        </div>
      );
    }

    if (upload.file_status === 'processing') {
      return (
        <div>
        <span className="font-semibold text-gray-300">File Info:</span>
        <br />
        <span className="text-xs text-gray-400">
        Type: {upload.file_metadata.content_type}, Size: {formatFileSize(upload.file_metadata.size)}
        </span>
        </div>
      );
    }

    if (
      upload.file_status === 'complete' &&
      upload.result &&
      !upload.result.audio_analysis &&
      !upload.result.image_result &&
      !upload.result.video_analysis
    ) {
      return (
        <div>
        <span className="font-semibold text-red-400">Error:</span>
        <br />
        <span className="text-xs text-red-400">No results available - Processing failed</span>
        </div>
      );
    }

    if (upload.file_status === 'complete') {
      const results: ReactElement[] = [];

      // Image Analysis
      if (upload.result?.image_result && upload.file_metadata.content_type.toLowerCase().includes('image')) {
        results.push(
          <div key="image-analysis" className="mb-2 p-2 border border-gray-700 rounded-md">
          <h4 className="text-sm font-semibold text-gray-300 mb-1">Image Analysis:</h4>
          <p className="text-xs text-gray-400">
          Verdict:{' '}
          <span className={getLabelColor(upload.result.image_result.label_image)}>
          {capitalizeFirst(upload.result.image_result.label_image)}
          </span>
          </p>
          </div>
        );
      }

      // Video + Audio: show video_analysis fields including predicted_class
      const isVideo = upload.file_metadata.content_type.toLowerCase().includes('video');
      const hasVideoAnalysis = isVideo && upload.result?.video_analysis;
      const hasAudioAnalysis = upload.result?.audio_analysis;

      if (hasVideoAnalysis) {
        const v = upload.result!.video_analysis!;
        results.push(
          <div key="video-analysis" className="mb-2 p-2 border border-gray-700 rounded-md">
          <h4 className="text-sm font-semibold text-blue-300 mb-1">Video Analysis:</h4>
          <p className="text-xs text-gray-400">
          Verdict:{' '}
          <span className={getLabelColor(v.verdict)}>{capitalizeFirst(v.verdict)}</span>
          </p>
          <p className="text-xs text-gray-400">
          Predicted Class: <span className="text-gray-300">{formatClassName(v.predicted_class)}</span>
          </p>
          <p className="text-xs text-gray-400">
          Fake Confidence: <span className="text-red-300">{(v.fake_confidence * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Real Confidence: <span className="text-green-300">{(v.real_confidence * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Processing Time: <span className="text-gray-300">{v.processing_time?.toFixed(2) ?? 'N/A'}s</span>
          </p>
          <p className="text-xs text-gray-400">
          Avg Inference: <span className="text-gray-300">{v.avg_inference_ms?.toFixed(2) ?? 'N/A'} ms</span>
          </p>
          </div>
        );
      }

      // Audio Analysis — shown for both audio-only and video+audio (no predicted_class for audio)
      if (hasAudioAnalysis) {
        const a = upload.result!.audio_analysis!;
        results.push(
          <div key="audio-analysis" className="mb-2 p-2 border border-gray-700 rounded-md">
          <h4 className="text-sm font-semibold text-purple-300 mb-1">Audio Analysis:</h4>
          <p className="text-xs text-gray-400">
          Verdict:{' '}
          <span className={getLabelColor(a.verdict)}>{capitalizeFirst(a.verdict)}</span>
          </p>
          <p className="text-xs text-gray-400">
          Fake Confidence: <span className="text-red-300">{(a.fake_confidence * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Real Confidence: <span className="text-green-300">{(a.real_confidence * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Processing Time: <span className="text-gray-300">{a.processing_time?.toFixed(2) ?? 'N/A'}s</span>
          </p>
          <p className="text-xs text-gray-400">
          Avg Inference: <span className="text-gray-300">{a.avg_inference_ms?.toFixed(2) ?? 'N/A'} ms</span>
          </p>
          </div>
        );
      }

      return (
        <div>{results.length > 0 ? results : <span>No issues detected</span>}</div>
      );
    }

    return <span>-</span>;
  };

  // Calculate summary stats
  const fileUploads = data || [];
  let totalReal = 0, totalFake = 0;

  if (fileUploads.length > 0) {
    fileUploads.forEach(upload => {
      const { result } = upload;
      if (result) {
        if (result.image_result && result.image_result.label_image) {
          if (result.image_result.label_image.toLowerCase() === "real") totalReal++;
          if (result.image_result.label_image.toLowerCase() === "fake") totalFake++;
        }
        if (result.audio_analysis && result.audio_analysis.verdict) {
          if (result.audio_analysis.verdict.toLowerCase() === "real") totalReal++;
          if (result.audio_analysis.verdict.toLowerCase() === "fake") totalFake++;
        }
        if (result.video_analysis && result.video_analysis.verdict) {
          if (result.video_analysis.verdict.toLowerCase() === "real") totalReal++;
          if (result.video_analysis.verdict.toLowerCase() === "fake") totalFake++;
        }
      }
    });
  }


  useEffect(() => {
    console.log('Data state updated:', data);
    console.log('Error state updated:', error);
    console.log('Loading state updated:', loading);
  }, [data, error, loading]);

  return (
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="w-full h-full"
    >

    <div className="w-full h-full">
    <div className="flex flex-col gap-2 h-full py-1">
    {/* Summary Section */}
    {fileUploads.length > 0 ? (
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 py-2 px-1 mb-2 w-full">
      {/* Upload ID left */}
      <div className="flex flex-col items-start min-w-[120px] flex-1">
      <span className="text-xs text-gray-400">Upload ID</span>
      <span className="text-lg font-bold font-mono text-blue-400 break-all max-w-[320px] tracking-wide leading-tight select-all">
      {uploadId}
      </span>
      </div>
      {/* Center: Real/Fake */}
      <div className="flex flex-row items-center gap-8 flex-1 justify-center">
      <div className="flex flex-col items-center min-w-[80px]">
      <span className="text-xs text-gray-400">Total Real Uploads</span>
      <span className="text-lg font-bold text-green-400">{totalReal}</span>
      </div>
      <div className="w-px h-6 bg-gray-700 mx-2" />
      <div className="flex flex-col items-center min-w-[80px]">
      <span className="text-xs text-gray-400">Total Fake Uploads</span>
      <span className="text-lg font-bold text-red-400">{totalFake}</span>
      </div>
      </div>
      {/* Back Button right */}
      <div className="flex flex-col items-end min-w-[60px] flex-1 justify-center">
      <button
      className="text-blue-400 hover:text-blue-300 transition-all duration-200 text-sm p-2 rounded-full"
      onClick={handleBackToReport}
      aria-label="Back"
      >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      </button>
      </div>
      </div>
    ) : (
      <div className="flex justify-center items-center h-40">
      <span className="text-gray-400 text-lg">No results available</span>
      </div>
    )}

    {/* Only render table/cards if there are files */}
    {fileUploads.length > 0 && (
      <>
      {/* Error Message */}
      {error && (
        <div className="text-red-400 text-sm text-center">{error}</div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center text-gray-400 p-6"
        >
        <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"
        />
        <span className="ml-2">Loading...</span>
        </motion.div>
      )}

      {/* Table */}
      {!loading && !error && (
        <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex-1 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 min-h-0"
        >
        <div className="h-full overflow-hidden rounded-2xl">
        <div className="h-full overflow-y-auto">
        {/* Desktop Table View */}
        <div className="hidden md:block">
        <table className="min-w-full divide-y divide-gray-700/50">
        <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
        <tr>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
        Filename
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
        File Status
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
        Result
        </th>
        </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
        {data.map((upload, index) => (
          <motion.tr
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          key={index}
          className="hover:bg-gray-700/20 transition-all duration-200"
          >
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
          <div className="relative group">
          <div className="max-w-[500px] truncate">
          {upload.file_metadata.filename}
          </div>
          {upload.file_metadata.filename.length > 25 && (
            <div className="absolute left-0 -top-8 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-gray-100 group-hover:scale-100 whitespace-nowrap z-20">
            {upload.file_metadata.filename}
            </div>
          )}
          </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
          <motion.span
          whileHover={{ scale: 1.05 }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
            upload.file_status === 'complete'
            ? 'bg-green-900/50 text-green-400'
            : upload.file_status === 'pending'
            ? 'bg-yellow-900/50 text-yellow-400'
            : upload.file_status === 'processing'
            ? 'bg-blue-900/50 text-blue-400'
            : 'bg-red-900/50 text-red-400'
          }`}
          >
          {upload.file_status}
          </motion.span>
          </td>
          <td className="px-6 py-4 text-sm text-gray-300">
          <div className="flex justify-between items-center gap-2">
          <div>{formatResult(upload)}</div>
          {upload.result && upload.result.heatmap_url && upload.result.heatmap_url.length > 0 && (
            <button
            onClick={() => {
              if (upload.result) {
                const analysisData = {
                  upload_id: uploadId,
                  filename: upload.file_metadata.filename,
                  content_type: upload.file_metadata.content_type,
                  size: upload.file_metadata.size,
                  heatmap_urls: upload.result.heatmap_url,
                  label_audio: upload.result.audio_analysis?.verdict || null,
                  score_audio: upload.result.audio_analysis?.score_audio || null,
                  label_video: upload.result.video_analysis?.verdict || null, // Changed from predicted_class to verdict
                  score_video: upload.result.video_analysis?.score_video || null,
                  label_image: upload.result.image_result?.label_image || null,
                  score_image: upload.result.image_result?.score_image || null
                };
                navigate('/analysis', { state: analysisData });
              }
            }}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700/50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          </motion.tr>
        ))}
        </tbody>
        </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden w-full">
        <div className="space-y-4 p-2 w-full">
        {data.map((upload, index) => (
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          key={index}
          className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 w-full overflow-x-auto"
          >
          {/* Filename */}
          <div className="mb-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Filename
          </div>
          <div className="text-sm font-medium text-gray-300 break-all">
          {upload.file_metadata.filename}
          </div>
          </div>

          {/* File Status */}
          <div className="mb-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          File Status
          </div>
          <motion.span
          whileHover={{ scale: 1.05 }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
            upload.file_status === 'complete'
            ? 'bg-green-900/50 text-green-400'
            : upload.file_status === 'pending'
            ? 'bg-yellow-900/50 text-yellow-400'
            : upload.file_status === 'processing'
            ? 'bg-blue-900/50 text-blue-400'
            : 'bg-red-900/50 text-red-400'
          }`}
          >
          {upload.file_status}
          </motion.span>
          </div>

          {/* Result */}
          <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Result
          </div>
          <div className="flex justify-between items-start gap-2">
          <div className="flex-1">{formatResult(upload)}</div>
          {upload.result && upload.result.heatmap_url && upload.result.heatmap_url.length > 0 && (
            <button
            onClick={() => {
              if (upload.result) {
                const analysisData = {
                  upload_id: uploadId,
                  filename: upload.file_metadata.filename,
                  content_type: upload.file_metadata.content_type,
                  size: upload.file_metadata.size,
                  heatmap_urls: upload.result.heatmap_url,
                  label_audio: upload.result.audio_analysis?.verdict || null,
                  score_audio: upload.result.audio_analysis?.score_audio || null,
                  label_video: upload.result.video_analysis?.verdict || null,
                  score_video: upload.result.video_analysis?.score_video || null,
                  label_image: upload.result.image_result?.label_image || null,
                  score_image: upload.result.image_result?.score_image || null
                };
                navigate('/analysis', { state: analysisData });
              }
            }}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700/50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
          </div>
          </motion.div>
        ))}
        </div>
        </div>
        </div>
        </div>
        </motion.div>
      )}

      {/* Heatmap Modal */}
      {/* {selectedHeatmap && selectedHeatmap.result && (
        // <AnalysisModal />
        <Modal
        isOpen={!!selectedHeatmap}
        onClose={closeHeatmapModal}
        images={selectedHeatmap.result.heatmap_url}
        label_audio={contentType === 'audio' || contentType === 'video' ? selectedHeatmap.result.audio_analysis?.verdict || '' : ''}
        score_audio={contentType === 'audio' || contentType === 'video' ? selectedHeatmap.result.audio_analysis?.score_audio || 0 : 0}
        label_image={contentType === 'image' ? (selectedHeatmap.result.image_result?.label_image || '') : ''}
        score_image={contentType === 'image' ? (selectedHeatmap.result.image_result?.score_image || 0) : 0}
        label_video={contentType === 'video' ? (selectedHeatmap.result.video_analysis?.predicted_class || '') : ''}
        score_video={contentType === 'video' ? (selectedHeathetmap.result.video_analysis?.score_video || 0) : 0}
        />
    )} */}
    </>
    )}
    </div>
    </div>
    </motion.div>
  );
};

export default ReportDetail;
