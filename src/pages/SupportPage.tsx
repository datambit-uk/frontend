import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as Loader2, AlertCircle, Check, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileWithPreview extends File {
  preview?: string;
}

interface UploadError {
  file?: string;
  reason?: string;
  general?: string;
}

interface SupportTicket {
  created_at: string;
  files: string[];
  reason: string;
  status: string;
  ticket_id: string;
  updated_at: string;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const TOTAL_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_WORDS = 300;

const SupportPage: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<UploadError>({});
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fetchingTickets, setFetchingTickets] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [expandedReason, setExpandedReason] = useState<string | null>(null);
  const [expandedImages, setExpandedImages] = useState<string | null>(null);

  // Fetch tickets on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setFetchingTickets(true);
    setFetchError('');
    try {
      const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      if (!token) throw new Error('Authentication token not found');
      const res = await fetch('https://production.datambit.com/api/v2/auth/me/support-tickets', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 'success') {
        setTickets(data.message);
      } else {
        setFetchError('Failed to fetch tickets');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch tickets');
    } finally {
      setFetchingTickets(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setErrors({});

    // Validate file types and sizes
    const invalidFiles = selectedFiles.filter(
      file => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalidFiles.length > 0) {
      setErrors(prev => ({
        ...prev,
        file: 'Files must be JPG/JPEG/PNG and less than 1MB each'
      }));
      return;
    }

    // Check total size
    const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > TOTAL_MAX_SIZE) {
      setErrors(prev => ({
        ...prev,
        file: 'Total file size must not exceed 2MB'
      }));
      return;
    }

    // Create previews
    const filesWithPreviews = selectedFiles.map(file => {
      const preview = URL.createObjectURL(file);
      return Object.assign(file, { preview });
    });

    setFiles(filesWithPreviews);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const words = e.target.value.trim().split(/\s+/).length;
    if (words <= MAX_WORDS || e.target.value === '') {
      setReason(e.target.value);
      setErrors(prev => ({ ...prev, reason: undefined }));
    }
  };

  const uploadFiles = (formData: FormData): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      // Get the JWT token from localStorage or sessionStorage
      const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      if (!token) {
        reject(new Error('Authentication token not found'));
        return;
      }
      
      xhr.open('POST', 'https://production.datambit.com/api/v2/auth/support', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setUploadProgress(0);

    // Validation
    if (files.length === 0) {
      setErrors(prev => ({ ...prev, file: 'Please upload at least one image' }));
      return;
    }

    if (!reason.trim()) {
      setErrors(prev => ({ ...prev, reason: 'Please provide a reason' }));
      return;
    }

    const words = reason.trim().split(/\s+/).length;
    if (words > MAX_WORDS) {
      setErrors(prev => ({ ...prev, reason: `Reason cannot exceed ${MAX_WORDS} words` }));
      return;
    }

    try {
      setIsLoading(true);

      // Create FormData
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('reason', reason);

      const response = await uploadFiles(formData);

      setSuccess(`Support ticket created successfully! Ticket ID: ${response.message.ticket_id}`);
      setFiles([]);
      setReason('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh tickets after successful submission
      fetchTickets();
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        general: err.message || 'Failed to submit support request. Please try again.'
      }));
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6 flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Support Tickets</h1>
          <p className="text-gray-400">View and create support requests</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow disabled:opacity-50"
          onClick={() => setShowForm(true)}
          disabled={isLoading}
        >
          <PlusCircle className="w-5 h-5" /> New Support Request
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-6">
        {/* Tickets List */}
        {!showForm && (
          <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700 mb-8" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {fetchingTickets ? (
              <div className="text-blue-400 text-center py-8">Loading tickets...</div>
            ) : fetchError ? (
              <div className="text-red-400 text-center py-8">{fetchError}</div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-200 mb-2">Tickets</h2>
                {tickets.length === 0 ? (
                  <div className="text-gray-400 mb-6">No tickets found.</div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map(ticket => {
                      const isReasonExpanded = expandedReason === ticket.ticket_id;
                      const isImagesExpanded = expandedImages === ticket.ticket_id;
                      const reasonTruncated = ticket.reason.length > 60 && !isReasonExpanded
                        ? ticket.reason.slice(0, 60) + '...'
                        : ticket.reason;
                      return (
                        <div key={ticket.ticket_id} className="bg-gray-900 rounded-lg p-4 border border-gray-700 flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-blue-400">{ticket.ticket_id}</span>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase"
                                style={{ backgroundColor: ticket.status === 'open' ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: ticket.status === 'open' ? '#22c55e' : '#ef4444' }}>
                                <span className={`inline-block w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {ticket.status}
                              </span>
                            </div>
                            <div className="text-gray-200 font-medium mb-1 cursor-pointer select-none flex items-center gap-2"
                              onClick={() => setExpandedReason(isReasonExpanded ? null : ticket.ticket_id)}>
                              <span>{reasonTruncated}</span>
                              {ticket.reason.length > 60 && (
                                <span className="text-blue-400 text-xs">{isReasonExpanded ? 'Show less' : 'Show more'}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">Created: {new Date(ticket.created_at).toLocaleString()}</div>
                            {/* Images Expand/Collapse */}
                            {ticket.files.length > 0 && (
                              <>
                                <button
                                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mb-2"
                                  onClick={() => setExpandedImages(isImagesExpanded ? null : ticket.ticket_id)}
                                >
                                  {isImagesExpanded ? (
                                    <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  )}
                                  {isImagesExpanded ? 'Hide Images' : 'Show Images'}
                                </button>
                                <AnimatePresence initial={false}>
                                  {isImagesExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="flex flex-wrap gap-2 mb-2 mt-1">
                                        {ticket.files.map((url, idx) => (
                                          <img key={idx} src={url} alt="attachment" className="w-16 h-16 object-cover rounded border border-gray-700" />
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Support Request Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-auto relative">
              <button
                type="button"
                className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 absolute top-4 right-4"
                onClick={() => setShowForm(false)}
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
              {/* Existing form code below */}
              <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {/* File Upload Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Upload Images
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-lg hover:border-gray-500 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400">
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, JPEG up to 1MB each (max 2MB total)
                  </p>
                </div>
              </div>

              {/* Preview Section */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 max-h-[calc(100vh-24rem)] overflow-y-auto">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 max-h-[200px]">
                        <img
                          src={file.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-contain bg-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {errors.file && (
                <p className="text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.file}
                </p>
              )}
            </div>

            {/* Reason Section */}
            <div className="space-y-2">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-300">
                Reason for Support
              </label>
              <div className="relative">
                <textarea
                  id="reason"
                  value={reason}
                  onChange={handleReasonChange}
                  rows={4}
                  className={`block w-full px-3 py-2 bg-gray-800 border ${
                    errors.reason ? 'border-red-500' : 'border-gray-700'
                  } rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Please describe your issue..."
                  disabled={isLoading}
                />
                <div className="absolute bottom-2 right-2 text-sm text-gray-400">
                  {reason.trim().split(/\s+/).filter(Boolean).length}/{MAX_WORDS} words
                </div>
              </div>
              {errors.reason && (
                <p className="text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.reason}
                </p>
              )}
            </div>

            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-sm text-gray-400 mt-1 text-center">{uploadProgress}% uploaded</p>
              </div>
            )}

            {/* Error and Success Messages */}
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start"
              >
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{errors.general}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-900/50 border border-green-700 rounded-md flex items-start"
              >
                <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">{success}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Submitting...
                </span>
              ) : (
                "Submit Support Request"
              )}
            </motion.button>
          </form>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage; 