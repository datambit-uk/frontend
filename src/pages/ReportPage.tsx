import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { apiCall } from "../api/api";
import { Link } from 'react-router-dom';
import { apiCall } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";


interface FileStatus {
  total_files: number;
  upload_status: string;
  error_count: number;
  finished_count: number;
  pending_count: number;
}

interface ReportEntry {
  created_at: string;
  files_status: FileStatus;
  upload_id: string;
  content_type: string;
  updated_at: string;
  total_real?: number;
  total_fake?: number;
}

interface ReportResponse {
  code: string;
  message: {
    data: ReportEntry[];
    has_next: boolean;
    has_prev: boolean;
    page: number;
    per_page: number;
    total: number;
  };
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const localDateTime = date.toLocaleString();
  const gmtOffset = date.getTimezoneOffset();
  const gmtSign = gmtOffset > 0 ? '-' : '+';
  const gmtHours = Math.abs(Math.floor(gmtOffset / 60));
  const gmtMinutes = Math.abs(gmtOffset % 60);
  const gmtString = `GMT${gmtSign}${String(gmtHours).padStart(2, '0')}:${String(gmtMinutes).padStart(2, '0')}`;
  return `${localDateTime} (${gmtString})`;
};

const Report: React.FC = () => {
  const [data, setData] = useState<ReportEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrev, setHasPrev] = useState<boolean>(false);
  const pageSize = 10;
  const [hasProcessingItems, setHasProcessingItems] = useState<boolean>(false);
  const pollingInterval = useRef<number | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds

  const contentTypes = [
    { label: 'All Types', value: null },
    { label: 'Audio', value: 'audio' },
    { label: 'Video', value: 'video' },
    { label: 'Image', value: 'image' }
  ];

  // Check if the current page has any processing items
  const checkForProcessingItems = useCallback((items: ReportEntry[]) => {
    return items.some(item => item.files_status.upload_status === 'processing');
  }, []);

  // Clear polling interval
  const clearPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Setup polling if needed
  const setupPolling = useCallback(() => {
    if (hasProcessingItems && !pollingInterval.current) {
      pollingInterval.current = setInterval(() => {
        fetchData(activeFilter, currentPage, pageSize);
      }, POLL_INTERVAL);
    } else if (!hasProcessingItems) {
      clearPolling();
    }
  }, [hasProcessingItems, activeFilter, currentPage, pageSize]);

  const fetchData = async (contentType: string | null, page: number, perPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

      if (!token) {
        alert("Authentication token missing. Please log in again.");
        return;
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(contentType && { content_type: contentType }),
      });

      const url = `/api/v2/report/recent-uploads?${queryParams.toString()}`;

      
      const result: ReportResponse = await apiCall({
        endpoint: url,
        method: 'GET',
        jwtToken: true
      });

      console.log(result.code);

      if (result.code === 'success') {
        setData(result.message.data);
        setTotalItems(result.message.total);
        setHasNext(result.message.has_next);
        setHasPrev(result.message.has_prev);
        
        // Check for processing items in the new data
        const hasProcessing = checkForProcessingItems(result.message.data);
        setHasProcessingItems(hasProcessing);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      // setError('Error fetching data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Effect for polling setup
  useEffect(() => {
    setupPolling();
    
    // Cleanup on unmount or when dependencies change
    return () => clearPolling();
  }, [hasProcessingItems, activeFilter, currentPage, setupPolling, clearPolling]);

  // Effect for page/filter changes
  useEffect(() => {
    setCurrentPage(1);
    clearPolling(); // Clear existing polling when filter changes
    fetchData(activeFilter, 1, pageSize);
  }, [activeFilter]);

  useEffect(() => {
    fetchData(activeFilter, currentPage, pageSize);
  }, [currentPage]);

  // In the Report component, after fetching data, filter to last 24 hours
  const [filteredData, setFilteredData] = useState<ReportEntry[]>([]);

  useEffect(() => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }
    const now = Date.now();
    setFilteredData(
      data.filter(entry => {
        if (!entry.created_at) return true;
        const created = new Date(entry.created_at).getTime();
        return now - created <= 24 * 60 * 60 * 1000;
      })
    );
  }, [data]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  // const getFileTypeCount = (type: string) => {
  //   return data.filter(entry => entry.content_type === type).length;
  // };

  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full bg-gray-900 w-full px-8 rounded-2xl"
    >
      <div className="w-full max-w-7xl mx-auto ">
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Recent Uploads</h2>
              {hasProcessingItems && (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-900/50 text-blue-400 animate-pulse">
                  Auto-refreshing
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Content Type Filter */}
              <div className="relative">
                <select
                  value={activeFilter || ''}
                  onChange={(e) => setActiveFilter(e.target.value || null)}
                  className="appearance-none bg-gray-800 text-gray-300 px-4 py-2 pr-8 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                >
                  {contentTypes.map((type) => (
                    <option key={type.value || 'all'} value={type.value || ''}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* Pagination Controls */}
              {!loading && !error && filteredData.length > 0 && (
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex items-center gap-4"
                >
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrev}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      !hasPrev 
                        ? 'text-gray-600 cursor-not-allowed' 
                        : 'text-blue-400 hover:bg-gray-800 hover:scale-105'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalItems === 10 ? Math.ceil(totalItems / pageSize) : currentPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNext}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      !hasNext 
                        ? 'text-gray-600 cursor-not-allowed' 
                        : 'text-blue-400 hover:bg-gray-800 hover:scale-105'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Table Section */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex-1 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 min-h-0 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-sm text-center p-6"
                >
                  {error}
                </motion.div>
              )}

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

              {!loading && !error && filteredData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-gray-400 text-lg mb-4">No uploads made in the last 24 hours.</div>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-sm font-semibold transition-all"
                  >
                    Click to upload
                  </button>
                </div>
              )}

              {!loading && !error && filteredData.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-x-auto"
                >
                  <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-gray-700/50">
                      <thead>
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Upload ID
                          </th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Total Files
                          </th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            File Types
                          </th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Date & Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredData.map((entry, index) => (
                          <motion.tr
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            key={entry.upload_id}
                            className="hover:bg-gray-700/20 transition-all duration-200"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link 
                                to={`/report/${entry.upload_id}`}
                                className="transition-all duration-200 hover:text-blue-300 hover:translate-x-1 inline-block text-sm font-mono text-blue-400"
                              >
                                {entry.upload_id}
                              </Link>
                              {/* Mobile-only status indicator */}
                              <div className="sm:hidden mt-1">
                                <motion.span
                                  whileHover={{ scale: 1.05 }}
                                  className={`px-2 py-0.5 text-[10px] rounded-full font-medium inline-block ${
                                    entry.files_status.upload_status === 'complete'
                                      ? 'bg-green-900/50 text-green-400'
                                      : entry.files_status.upload_status === 'pending'
                                      ? 'bg-yellow-900/50 text-yellow-400'
                                      : entry.files_status.upload_status === 'processing'
                                      ? 'bg-blue-900/50 text-blue-400'
                                      : 'bg-red-900/50 text-red-400'
                                  }`}
                                >
                                  {entry.files_status.upload_status}
                                </motion.span>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              {entry.files_status.total_files}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                              <motion.span 
                                whileHover={{ scale: 1.05 }}
                                className="px-2.5 py-1 text-xs rounded-full bg-gray-700/50 text-gray-300 capitalize inline-block"
                              >
                                {entry.content_type}
                              </motion.span>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                              <motion.span
                                whileHover={{ scale: 1.05 }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                                  entry.files_status.upload_status === 'complete'
                                    ? 'bg-green-900/50 text-green-400'
                                    : entry.files_status.upload_status === 'pending'
                                    ? 'bg-yellow-900/50 text-yellow-400'
                                    : entry.files_status.upload_status === 'processing'
                                    ? 'bg-blue-900/50 text-blue-400'
                                    : 'bg-red-900/50 text-red-400'
                                }`}
                              >
                                {entry.files_status.upload_status}
                              </motion.span>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              {formatDateTime(entry.created_at)}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Report;
