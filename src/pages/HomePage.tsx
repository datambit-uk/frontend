import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import SearchBar from "../components/SearchBar";
import { AudioLines, Video, Image as ImageIcon, Copy, Check, X } from "lucide-react";
import MediaCard from "../components/MediaCard";
import Dropbox from "../components/Dropbox";

interface UploadResponse {
  code: string;
  message: string;
}

const Home: React.FC = () => {
//   const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [showDropbox, setShowDropbox] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dropboxKey, setDropboxKey] = useState(0);
  const [responseMessage, setResponseMessage] = useState<{ 
    status: 'success' | 'error' | null; 
    message: string;
    uploadId?: string;
  }>({
    status: null,
    message: ''
  });
  const [countdown, setCountdown] = useState(2);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const API_URL = "https://production.datambit.com";

  // Timer effect to redirect to report detail page after successful upload
  useEffect(() => {
    if (responseMessage.status === 'success' && responseMessage.uploadId) {
      setCountdown(2); // Reset countdown to 2 seconds
      
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            navigate(`/report/${responseMessage.uploadId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000); // Update every second

      return () => clearInterval(countdownTimer);
    }
  }, [responseMessage.status, responseMessage.uploadId, navigate]);

  

  const handleMediaClick = (type: string) => {
    console.log(`${type} clicked`);
    if (selectedCard === type) {
      setSelectedCard(null);
      setShowDropbox(false);
      setResponseMessage({ status: null, message: '' });
    } else {
      setSelectedCard(type);
      setShowDropbox(true);
      setResponseMessage({ status: null, message: '' });
    }
    setFiles([]);
    setUploadProgress(0);
    setDropboxKey(prev => prev + 1);
  };

  const handleFilesAdded = (newFiles: File[]) => {
    if (!selectedCard) return;
    const newFileCount = files.length + newFiles.length;
    if (newFileCount > 50) {
      alert(`You can only upload a maximum of 50 ${selectedCard.toLowerCase()} files. Currently at ${files.length}.`);
      return;
    }
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setFiles([]);
      setDropboxKey(prev => prev + 1);
      setResponseMessage({
        status: 'error',
        message: 'Upload aborted. Click upload to try again.'
      });
    }
  };

  const uploadFiles = () => {
    if (!selectedCard || files.length === 0) {
      alert("Please select files to upload first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResponseMessage({ status: null, message: '' });

    const formData = new FormData();
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    
    // Check if total size is too large (e.g., over 100MB)
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
    if (totalSize > MAX_TOTAL_SIZE) {
      setResponseMessage({
        status: 'error',
        message: 'Total file size exceeds 100MB limit. Please reduce the number of files or their sizes.'
      });
      setIsUploading(false);
      return;
    }

    files.forEach(file => formData.append('files', file));
    const mediaType = selectedCard.toLowerCase();
    const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

    if (!token) {
      alert("Authentication token missing. Please log in again.");
      setIsUploading(false);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // Set timeout for the request (3 minutes)
    xhr.timeout = 180000; // 3 minutes in milliseconds

    let lastProgress = 0;
    let noProgressTimer: number | null = null;

    const resetNoProgressTimer = () => {
      if (noProgressTimer) {
        clearTimeout(noProgressTimer);
      }
      noProgressTimer = setTimeout(() => {
        if (xhrRef.current) {
          xhrRef.current.abort();
          setResponseMessage({
            status: 'error',
            message: 'Upload timed out due to no progress. Please try again.'
          });
          setIsUploading(false);
          setDropboxKey(prev => prev + 1);
        }
      }, 30000); // 30 seconds without progress will trigger timeout
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        setUploadProgress(percent);
        
        // Reset the no-progress timer if we've made progress
        if (percent > lastProgress) {
          lastProgress = percent;
          resetNoProgressTimer();
        }
      }
    };

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (noProgressTimer) {
          clearTimeout(noProgressTimer);
        }
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as UploadResponse;
            console.log('Upload Response:', response);
            setResponseMessage({
              status: 'success',
              message: 'Upload completed successfully!',
              uploadId: response.message
            });
            setFiles([]);
            setUploadProgress(0);
            setDropboxKey(prev => prev + 1);
          } catch (e) {
            setResponseMessage({
              status: 'error',
              message: 'Upload completed but failed to parse response'
            });
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setResponseMessage({
              status: 'error',
              message: `Error: ${xhr.status} ${errorResponse.message || 'Unknown error'}`
            });
          } catch (e) {
            setResponseMessage({
              status: 'error',
              message: `Error: ${xhr.status} - Upload failed. Please try again.`
            });
          }
        }
      }
    };

    xhr.ontimeout = () => {
      setResponseMessage({
        status: 'error',
        message: 'Upload timed out. Please try again with fewer or smaller files.'
      });
      setIsUploading(false);
      setDropboxKey(prev => prev + 1);
    };

    xhr.onerror = () => {
      setResponseMessage({
        status: 'error',
        message: 'Network error occurred. Please check your connection and try again.'
      });
      setIsUploading(false);
      setDropboxKey(prev => prev + 1);
    };

    resetNoProgressTimer(); // Start the initial no-progress timer

    try {
      xhr.open("POST", `${API_URL}/api/v1/${mediaType}/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      setResponseMessage({
        status: 'error',
        message: 'Failed to start upload. Please try again.'
      });
      setIsUploading(false);
      setDropboxKey(prev => prev + 1);
    }
  };

  return (

    
    <div className="flex flex-col gap-8">
      {/* <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchClick={handleSearchClick}
      /> */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MediaCard
          icon={<AudioLines className="w-8 h-8 text-blue-400" />}
          label="Upload Audio"
          onClick={() => handleMediaClick("Audio")}
          isSelected={selectedCard === "Audio"}
        />
        <MediaCard
          icon={<Video className="w-8 h-8 text-blue-400" />}
          label="Upload Video"
          onClick={() => handleMediaClick("Video")}
          isSelected={selectedCard === "Video"}
        />
        <MediaCard
          icon={<ImageIcon className="w-8 h-8 text-blue-400" />}
          label="Upload Image"
          onClick={() => handleMediaClick("Image")}
          isSelected={selectedCard === "Image"}
        />
      </div>

      {showDropbox && (
        <div className="space-y-4">
          <Dropbox 
            key={dropboxKey}
            mediaType={selectedCard}
            onFilesAdded={handleFilesAdded}
            currentFileCount={files.length}
          />
          
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400">
                {files.length} file(s) selected
              </p>
              <div className="mt-4">
                <button 
                  className={`bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors ${
                    isUploading 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-blue-700'
                  }`}
                  onClick={uploadFiles}
                  disabled={isUploading}
                >
                  {isUploading ? `Uploading ${selectedCard} Files...` : `Upload ${selectedCard} Files`}
                </button>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out relative"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute -right-4 -top-7 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        {uploadProgress.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={cancelUpload}
                  className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
                  title="Cancel upload"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          )}

          {!isUploading && responseMessage.status && (
            <div className={`p-4 rounded-lg ${
              responseMessage.status === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
            }`}>
              <p className="mb-2">{responseMessage.message}</p>
              {responseMessage.status === 'success' && responseMessage.uploadId && (
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-300 mb-1">Upload ID:</span>
                    <code className="text-sm font-mono flex-1">
                      {responseMessage.uploadId}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(responseMessage.uploadId!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Copy upload ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
              
              {/* Countdown Timer */}
              {responseMessage.status === 'success' && countdown > 0 && (
                <div className="mt-3 flex items-center justify-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      {/* Background circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="rgba(34, 197, 94, 0.2)"
                        strokeWidth="4"
                        fill="none"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="rgb(34, 197, 94)"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(countdown / 2) * 125.6} 125.6`}
                        style={{
                          transition: 'stroke-dasharray 0.3s ease-in-out'
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-400">{countdown}</span>
                    </div>
                  </div>
                  <span className="text-sm text-green-300">Redirecting to report...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
