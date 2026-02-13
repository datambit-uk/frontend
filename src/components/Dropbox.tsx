import React, { useState } from "react";
import { UploadCloud } from "lucide-react";

interface DropboxProps {
    mediaType: string | null;
    onFilesAdded: (files: File[]) => void;
    currentFileCount: number;
}

const Dropbox: React.FC<DropboxProps> = ({ mediaType, onFilesAdded, currentFileCount }) => {
  const [isDragging, setIsDragging] = useState(false);

  const getAcceptedFileTypes = () => {
    switch (mediaType) {
      case "Audio":
        return "audio/*";
      case "Video":
        return "video/*";
      case "Image":
        return "image/*";
      default:
        return "";
    }
  };

  const handleFiles = (files: FileList) => {
    // Filter files based on mediaType
    const filteredFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      const fileType = file.type.split('/')[0]; // Gets 'audio', 'video', or 'image'
      
      if (
        (mediaType === "Audio" && fileType === "audio") ||
        (mediaType === "Video" && fileType === "video") ||
        (mediaType === "Image" && fileType === "image")
      ) {
        filteredFiles.push(file);
      }
    });
    
    if (filteredFiles.length === 0) {
      alert(`Please select ${mediaType?.toLowerCase()} files only.`);
      return;
    }
    
    // Check if adding these files would exceed the limit
    if (currentFileCount + filteredFiles.length > 50) {
      alert(`You can only upload a maximum of 50 ${mediaType?.toLowerCase()} files. Currently at ${currentFileCount}.`);
      return;
    }
    
    onFilesAdded(filteredFiles);
  };

  return (
    <div
      className={`
        relative
        border-2 border-dashed rounded-2xl p-10 mt-10
        transition-all duration-300
        ${isDragging ? "border-blue-400 bg-blue-900/20" : "border-gray-700/20 bg-gray-900/90"}
        flex flex-col items-center justify-center text-gray-200
        cursor-pointer backdrop-blur-sm
        shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
        before:absolute before:inset-0 
        before:bg-gradient-to-r before:from-transparent 
        before:via-white/[0.02] before:to-transparent 
        before:rounded-2xl
        hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.4)]
        hover:transform hover:scale-[1.01]
        hover:border-gray-600
      `}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => document.getElementById("fileInput")?.click()}
    >
      <UploadCloud className="w-12 h-12 text-blue-400 mb-4 transform transition-transform group-hover:scale-110" />
      <p className="text-md font-medium text-gray-200">Drag & drop {mediaType} here</p>
      <p className="text-sm text-gray-400 mt-1">or click to browse</p>
      <p className="text-sm text-gray-400 mt-4">
        {currentFileCount}/50 files selected
      </p>
      <input
        id="fileInput"
        type="file"
        multiple
        accept={getAcceptedFileTypes()}
        className="hidden"
        onChange={(e) => {
            if (e.target.files) {
                handleFiles(e.target.files);
            }
        }}
      />
    </div>
  );
};

export default Dropbox;
