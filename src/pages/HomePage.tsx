import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Copy, Check, X } from "lucide-react";
import MediaCard from "../components/MediaCard";
import Dropbox from "../components/Dropbox";

interface UploadResponse {
  code: string;
  message: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [showDropbox, setShowDropbox] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generateHeatmap, setGenerateHeatmap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropboxKey, setDropboxKey] = useState(0);
  const [responseMessage, setResponseMessage] = useState<{
    status: "success" | "error" | null;
    message: string;
    uploadId?: string;
  }>({
    status: null,
    message: "",
  });
  const [countdown, setCountdown] = useState(2);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const API_URL = "https://production.datambit.com";

  // Redirect to report page after successful upload
  useEffect(() => {
    if (responseMessage.status === "success" && responseMessage.uploadId) {
      setCountdown(2);

      const countdownTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            navigate(`/report/${responseMessage.uploadId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownTimer);
    }
  }, [responseMessage.status, responseMessage.uploadId, navigate]);

  const handleMediaClick = (type: string) => {
    if (selectedCard === type) {
      setSelectedCard(null);
      setShowDropbox(false);
      setResponseMessage({ status: null, message: "" });
    } else {
      setSelectedCard(type);
      setShowDropbox(true);
      setResponseMessage({ status: null, message: "" });
    }
    setFiles([]);
    setUploadProgress(0);
    setDropboxKey((prev) => prev + 1);
  };

  const handleFilesAdded = (newFiles: File[]) => {
    if (!selectedCard) return;
    const newFileCount = files.length + newFiles.length;
    if (newFileCount > 50) {
      alert(
        `You can only upload a maximum of 50 files. Currently at ${files.length}.`
      );
      return;
    }
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setFiles([]);
      setDropboxKey((prev) => prev + 1);
      setResponseMessage({
        status: "error",
        message: "Upload aborted. Click upload to try again.",
      });
    }
  };

  const uploadFiles = async () => {
    if (!selectedCard || files.length === 0) {
      alert("Please select files to upload first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResponseMessage({ status: null, message: "" });

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
    if (totalSize > MAX_TOTAL_SIZE) {
      setResponseMessage({
        status: "error",
        message:
        "Total file size exceeds 100MB limit. Please reduce the number of files or their sizes.",
      });
      setIsUploading(false);
      return;
    }

    const token =
    localStorage.getItem("jwtToken") ?? sessionStorage.getItem("jwtToken");
    if (!token) {
      alert("Authentication token missing. Please log in again.");
      setIsUploading(false);
      return;
    }

    // Route files to the correct API endpoint by MIME type
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

    const uploadGroups: { files: File[]; type: string }[] = [];
    if (videoFiles.length > 0)
      uploadGroups.push({ files: videoFiles, type: "video" });
    if (audioFiles.length > 0)
      uploadGroups.push({ files: audioFiles, type: "audio" });

    if (uploadGroups.length === 0) {
      setResponseMessage({
        status: "error",
        message: "No valid video or audio files selected.",
      });
      setIsUploading(false);
      return;
    }

    const groupProgresses = uploadGroups.map(() => 0);

    const performUpload = (
      group: { files: File[]; type: string },
      index: number
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        group.files.forEach((file) => formData.append("files", file));

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.timeout = 180000; // 3 minutes

        let lastProgress = 0;
        let noProgressTimer: number | null = null;

        const resetNoProgressTimer = () => {
          if (noProgressTimer) clearTimeout(noProgressTimer);
          noProgressTimer = setTimeout(() => {
            if (xhrRef.current) {
              xhrRef.current.abort();
              reject(new Error("Upload timed out due to no progress."));
            }
          }, 30000);
        };

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            groupProgresses[index] = percent;
            const totalProgress =
            groupProgresses.reduce((sum, p) => sum + p, 0) /
            uploadGroups.length;
            setUploadProgress(totalProgress);

            if (percent > lastProgress) {
              lastProgress = percent;
              resetNoProgressTimer();
            }
          }
        };

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (noProgressTimer) clearTimeout(noProgressTimer);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(
                  xhr.responseText
                ) as UploadResponse;
                resolve(response.message);
              } catch {
                reject(new Error("Failed to parse server response."));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(
                  new Error(
                    errorResponse.message ||
                    `Upload failed with status ${xhr.status}`
                  )
                );
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          }
        };

        xhr.ontimeout = () => reject(new Error("Upload timed out."));
        xhr.onerror = () => reject(new Error("Network error occurred."));

        resetNoProgressTimer();

        let uploadUrl = `${API_URL}/api/v1/${group.type}/upload`;
        if (generateHeatmap) {
          uploadUrl += `?generate-heatmaps=true`;
        }

        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    };

    try {
      let lastUploadId = "";
      for (let i = 0; i < uploadGroups.length; i++) {
        const uploadId = await performUpload(uploadGroups[i], i);
        lastUploadId = uploadId;
      }

      setIsUploading(false);
      setResponseMessage({
        status: "success",
        message:
        uploadGroups.length > 1
        ? `All ${uploadGroups.length} upload groups completed successfully!`
        : "Upload completed successfully!",
        uploadId: lastUploadId,
      });
      setFiles([]);
      setUploadProgress(0);
      setDropboxKey((prev) => prev + 1);
    } catch (error: unknown) {
      setIsUploading(false);
      const errorMessage =
      error instanceof Error
      ? error.message
      : "An error occurred during upload.";
      setResponseMessage({ status: "error", message: errorMessage });
      setDropboxKey((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col gap-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <MediaCard
    icon={<Video className="w-8 h-8 text-blue-400" />}
    label="Upload Video / Audio"
    onClick={() => handleMediaClick("Media")}
    isSelected={selectedCard === "Media"}
    />
    </div>

    {showDropbox && (
      <div className="space-y-4">
      {/*
        Pass mediaType as "Media" so the Dropbox component accepts
        both video/* and audio/* MIME types. Ensure your Dropbox
        component's accept logic handles this value, e.g.:
        accept = mediaType === "Media"
        ? "video/*,audio/*"
        : `${mediaType.toLowerCase()}/*`
        */}
        <Dropbox
        key={dropboxKey}
        mediaType={selectedCard}
        onFilesAdded={handleFilesAdded}
        currentFileCount={files.length}
        />

        {files.length > 0 && (
          <div className="mt-4 space-y-4">
          <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <button
          onClick={() => setGenerateHeatmap(!generateHeatmap)}
          className={`relative flex items-center justify-between w-full p-4 bg-gray-900 border ${generateHeatmap ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'} rounded-lg transition-all duration-300 hover:border-blue-400 group`}
          >
          <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${generateHeatmap ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'} transition-colors duration-300`}>
          <Video className="w-6 h-6" />
          </div>
          <div className="text-left">
          <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white uppercase tracking-wider">
          Generate AI Heatmap
          </span>
          <span className="px-2 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full uppercase">
          Future Enhancement
          </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
          Visualise engagement hotspots using our proprietary AI models
          </p>
          </div>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${generateHeatmap ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
          {generateHeatmap && <Check className="w-4 h-4 text-white" />}
          </div>
          </button>
          
          {/* Investor/CTA Tooltip - only shows on hover */}
          <div className="absolute left-0 -top-12 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-blue-600 text-white text-[10px] px-3 py-2 rounded shadow-xl flex items-center gap-2">
          <span className="font-bold">INVESTOR OPPORTUNITY:</span>
          <span>Scalable AI-driven engagement analytics engine.</span>
          </div>
          <div className="w-3 h-3 bg-blue-600 rotate-45 mx-auto -mt-1.5"></div>
          </div>
          </div>

          <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
          {files.length} file(s) selected
          </p>
          <button
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={uploadFiles}
          disabled={isUploading}
          >
          {isUploading ? (
            <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Uploading...
            </>
          ) : (
            <>
            Upload Files
            </>
          )}
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
          <div
          className={`p-4 rounded-lg ${
            responseMessage.status === "success"
            ? "bg-green-900/50 text-green-200"
            : "bg-red-900/50 text-red-200"
          }`}
          >
          <p className="mb-2">{responseMessage.message}</p>
          {responseMessage.status === "success" &&
            responseMessage.uploadId && (
              <div className="flex items-center gap-2 bg-black/20 p-2 rounded">
              <div className="flex flex-col">
              <span className="text-xs text-gray-300 mb-1">
              Upload ID:
              </span>
              <code className="text-sm font-mono flex-1">
              {responseMessage.uploadId}
              </code>
              </div>
              <button
              onClick={() => {
                navigator.clipboard.writeText(
                  responseMessage.uploadId!
                );
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

            {responseMessage.status === "success" && countdown > 0 && (
              <div className="mt-3 flex items-center justify-center gap-3">
              <div className="relative w-12 h-12">
              <svg
              className="w-12 h-12 transform -rotate-90"
              viewBox="0 0 48 48"
              >
              <circle
              cx="24"
              cy="24"
              r="20"
              stroke="rgba(34, 197, 94, 0.2)"
              strokeWidth="4"
              fill="none"
              />
              <circle
              cx="24"
              cy="24"
              r="20"
              stroke="rgb(34, 197, 94)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(countdown / 2) * 125.6} 125.6`}
              style={{ transition: "stroke-dasharray 0.3s ease-in-out" }}
              />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-green-400">
              {countdown}
              </span>
              </div>
              </div>
              <span className="text-sm text-green-300">
              Redirecting to report...
              </span>
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
