import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Copy, Check, X, AlertTriangle, Trash2 } from "lucide-react";
import Dropbox from "../components/Dropbox";
import { useMaintenance } from "../config/maintenance";
import { API_URL } from "../api/api";

interface RejectedFile {
  filename: string;
  reason: string;
}

interface UploadResponse {
  code: string;
  message: string;
}

class UploadValidationError extends Error {
  rejectedFiles: RejectedFile[];

  constructor(message: string, rejectedFiles: RejectedFile[]) {
    super(message);
    this.name = "UploadValidationError";
    this.rejectedFiles = rejectedFiles;
  }
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { uploadsDisabled, message: maintenanceMessage } = useMaintenance();
  const showDropbox = !uploadsDisabled;
  const selectedCard = "Media";
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generateHeatmap, setGenerateHeatmap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropboxKey, setDropboxKey] = useState(0);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
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

  const handleFilesAdded = (newFiles: File[]) => {
    if (!selectedCard) return;
    const newNames = new Set(newFiles.map((file) => file.name));
    const remainingCount = files.filter((file) => !newNames.has(file.name)).length;
    if (remainingCount + newFiles.length > 50) {
      alert(
        `You can only upload a maximum of 50 files. Currently at ${files.length}.`
      );
      return;
    }
    // Replace same-named files and clear their rejection markers.
    setFiles((prevFiles) => [
      ...prevFiles.filter((file) => !newNames.has(file.name)),
      ...newFiles,
    ]);
    setRejectedFiles((prev) =>
      prev.filter((item) => !newNames.has(item.filename))
    );
    setResponseMessage((prev) =>
      prev.status === "error" ? { status: null, message: "" } : prev
    );
  };

  const removeFile = (filename: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== filename));
    setRejectedFiles((prev) => {
      const next = prev.filter((item) => item.filename !== filename);
      if (next.length === 0) {
        setResponseMessage((msg) =>
          msg.status === "error" ? { status: null, message: "" } : msg
        );
      }
      return next;
    });
  };

  const removeAllRejected = () => {
    const rejectedNames = new Set(rejectedFiles.map((item) => item.filename));
    setFiles((prev) => prev.filter((file) => !rejectedNames.has(file.name)));
    setRejectedFiles([]);
    setResponseMessage((prev) =>
      prev.status === "error" ? { status: null, message: "" } : prev
    );
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setFiles([]);
      setRejectedFiles([]);
      setDropboxKey((prev) => prev + 1);
      setResponseMessage({
        status: "error",
        message: "Upload aborted. Click upload to try again.",
      });
    }
  };

  const uploadFiles = async () => {
    if (uploadsDisabled) {
      alert(maintenanceMessage);
      return;
    }

    if (!selectedCard || files.length === 0) {
      alert("Please select files to upload first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResponseMessage({ status: null, message: "" });
    setRejectedFiles([]);

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB
    if (totalSize > MAX_TOTAL_SIZE) {
      setResponseMessage({
        status: "error",
        message:
          "Total file size exceeds 500MB limit. Please reduce the number of files or their sizes.",
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

    // Single POST per group. Backend validates before GCS/queue in the same
    // request (all-or-nothing within the group). A separate validate_only pass
    // was removed: production was ignoring that flag and creating duplicate uploads.
    const postGroup = (
      group: { files: File[]; type: string },
      index: number
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        group.files.forEach((file) => formData.append("files", file));
        if (generateHeatmap) {
          formData.append("generate_heatmaps", "true");
        }

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.timeout = 180000;

        let lastProgress = 0;
        let noProgressTimer: ReturnType<typeof setTimeout> | null = null;

        const resetNoProgressTimer = () => {
          if (noProgressTimer) clearTimeout(noProgressTimer);
          noProgressTimer = setTimeout(() => {
            if (xhrRef.current) {
              reject(new Error("Upload timed out due to no progress."));
              xhrRef.current.abort();
            }
          }, 30000);
        };

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
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
            } else if (xhr.status === 0) {
              return;
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                const rejected =
                  (errorResponse.details?.rejected_files as
                    | RejectedFile[]
                    | undefined) ?? [];
                if (rejected.length > 0) {
                  reject(
                    new UploadValidationError(
                      errorResponse.message ||
                        `Validation failed with status ${xhr.status}`,
                      rejected
                    )
                  );
                } else {
                  reject(
                    new Error(
                      errorResponse.message ||
                        `Upload failed with status ${xhr.status}`
                    )
                  );
                }
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          }
        };

        xhr.ontimeout = () => reject(new Error("Upload timed out."));
        xhr.onerror = () => reject(new Error("Network error occurred."));

        resetNoProgressTimer();

        const uploadUrl = `${API_URL}/upload/${group.type}/upload`;
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    };

    try {
      let lastUploadId = "";
      for (let i = 0; i < uploadGroups.length; i++) {
        lastUploadId = await postGroup(uploadGroups[i], i);
      }

      setIsUploading(false);
      setUploadProgress(0);
      setRejectedFiles([]);
      setFiles([]);
      setDropboxKey((prev) => prev + 1);
      setResponseMessage({
        status: "success",
        message:
          uploadGroups.length > 1
            ? `All ${uploadGroups.length} upload groups completed successfully!`
            : "Upload completed successfully!",
        uploadId: lastUploadId,
      });
    } catch (error: unknown) {
      setIsUploading(false);
      setUploadProgress(0);
      if (error instanceof UploadValidationError) {
        setRejectedFiles(error.rejectedFiles);
        setResponseMessage({
          status: "error",
          message: `Validation failed for ${error.rejectedFiles.length} file(s). Remove or replace them, then upload again. Nothing was uploaded.`,
        });
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred during upload.";
        setResponseMessage({ status: "error", message: errorMessage });
      }
    }
  };

  const rejectionByName = new Map(
    rejectedFiles.map((item) => [item.filename, item.reason])
  );
  const hasInvalidFiles = rejectedFiles.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {uploadsDisabled && (
        <div className="bg-amber-900/40 border border-amber-500/50 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-amber-500 font-bold text-lg">
              Uploads Temporarily Disabled
            </h3>
            <p className="text-amber-200/80 mt-1">{maintenanceMessage}</p>
          </div>
        </div>
      )}

      {showDropbox && (
        <div className="space-y-4">
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
                  className={`relative flex items-center justify-between w-full p-4 bg-gray-900 border ${generateHeatmap ? "border-blue-500 bg-blue-500/10" : "border-gray-800"} rounded-lg transition-all duration-300 hover:border-blue-400 group`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${generateHeatmap ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"} transition-colors duration-300`}
                    >
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          Generate Heatmap
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full uppercase">
                          Takes Longer
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Visualise engagement hotspots using our proprietary AI
                        models
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${generateHeatmap ? "bg-blue-600 border-blue-600" : "border-gray-600"}`}
                  >
                    {generateHeatmap && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>

                <div className="absolute left-0 -top-12 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-blue-600 text-white text-[10px] px-3 py-2 rounded shadow-xl flex items-center gap-2">
                    <span className="font-bold">
                      Available on Portable version
                    </span>
                    <span>Air gapped | Stand alone | Edge</span>
                  </div>
                  <div className="w-3 h-3 bg-blue-600 rotate-45 mx-auto -mt-1.5"></div>
                </div>
              </div>

              <ul
                className={`space-y-2 rounded-lg border p-3 ${
                  hasInvalidFiles
                    ? "border-amber-500/30 bg-amber-950/30"
                    : "border-gray-700/50 bg-gray-900/50"
                }`}
              >
                {files.map((file) => {
                  const reason = rejectionByName.get(file.name);
                  const isInvalid = Boolean(reason);
                  return (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-medium ${
                            isInvalid ? "text-amber-100" : "text-gray-200"
                          }`}
                        >
                          {file.name}
                        </p>
                        {reason && (
                          <p className="mt-0.5 text-xs text-amber-200/80">
                            {reason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                        title={`Remove ${file.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
                {rejectedFiles.length > 1 && (
                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={removeAllRejected}
                      className="text-xs text-amber-300/90 underline hover:text-amber-100"
                    >
                      Remove all invalid files
                    </button>
                  </li>
                )}
              </ul>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-400">
                  {files.length} file(s) selected
                  {hasInvalidFiles ? ` · ${rejectedFiles.length} invalid` : ""}
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
                      {hasInvalidFiles ? "Validating..." : "Uploading..."}
                    </>
                  ) : (
                    <>Upload Files</>
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
                        style={{
                          transition: "stroke-dasharray 0.3s ease-in-out",
                        }}
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
