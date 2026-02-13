import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

const normalizeGCSUrl = (url: string) => {
    if (url.startsWith("gs://")) {
        url = url.replace("gs://genui-storage/", "https://storage.googleapis.com/genui-storage/");
    }
    return url;
};

const AnalysisPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Get data from navigation state
    const analysisData = location.state || {};
    const rawImages = analysisData.heatmap_urls || [];
    // Filter out fake URLs and ensure we have valid images
    const images = Array.isArray(rawImages) 
        ? rawImages.filter(url => url && !url.includes('fake.url.com'))
        : [];
    const meta = {
        upload_id: analysisData.upload_id || 'N/A',
        filename: analysisData.filename || 'N/A',
        content_type: analysisData.content_type || 'N/A',
        size: analysisData.size || 0,
        label_audio: analysisData.label_audio || null,
        score_audio: analysisData.score_audio || null,
        label_video: analysisData.label_video || null,
        score_video: analysisData.score_video || null,
        label_image: analysisData.label_image || null,
        score_image: analysisData.score_image || null
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };
    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const downloadImage = async (url: string) => {
        try {
            url = normalizeGCSUrl(url);
            setIsDownloading(true);
            
            const response = await fetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Image fetch failed');
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            // Extract filename from the URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1] || 'heatmap.png';
            
            const link = document.createElement("a");
            link.href = imageUrl;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(imageUrl);
        } catch (error) {
            console.log(error);
            alert("Something went wrong! Please try again later.");
        }

        setIsDownloading(false);
    };

    return (
        <div className="w-full h-full">
            <div className="w-full max-w-7xl mx-auto bg-gray-800/90 rounded-2xl shadow-xl p-8 border border-gray-700/50 flex flex-col gap-4">
                {/* Back Button */}
                <div className="flex justify-between items-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-blue-400 hover:text-blue-300 transition-all duration-200 text-sm p-2 rounded-full hover:bg-gray-700/50"
                        aria-label="Back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
                {/* Top Section: File Info and Carousel */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: File Information */}
                    <div className="flex-1 text-left">
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center mb-4">
                                <div className="w-3 h-3 bg-cyan-500 rounded-full mr-3 animate-pulse"></div>
                                <h3 className="font-bold text-gray-200 text-lg">File Information</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Upload ID:</span>
                                    <span className="font-mono text-blue-400 bg-gray-700/50 px-2 py-1 rounded">{meta.upload_id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Filename:</span>
                                    <div className="relative group">
                                        <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded truncate max-w-48 block">
                                            {meta.filename}
                                        </span>
                                        {meta.filename.length > 25 && (
                                            <div className="absolute left-0 -top-8 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-gray-100 group-hover:scale-100 whitespace-nowrap z-20 border border-gray-600/30">
                                                {meta.filename}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Type:</span>
                                    <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">{meta.content_type}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Size:</span>
                                    <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">{formatFileSize(meta.size)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right: Carousel */}
                    <div className="flex-1 flex flex-col items-center justify-start">
                        {images && images.length > 0 ? (
                            <>
                                <div className="relative w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                                    {/* Download Button */}
                                    <button
                                        onClick={() => downloadImage(images[currentImageIndex])}
                                        disabled={isDownloading}
                                        className="absolute top-4 left-4 z-20 text-white hover:text-gray-300 transition-colors p-2 bg-gray-800/70 rounded-full hover:bg-gray-700/70 disabled:opacity-50"
                                    >
                                        {isDownloading ? (
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.5"
                                                stroke="currentColor"
                                                className="h-5 w-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                                />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Magnify Button */}
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 transition-colors p-2 bg-gray-800/70 rounded-full hover:bg-gray-700/70"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.5"
                                            stroke="currentColor"
                                            className="h-5 w-5"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                        </svg>
                                    </button>
                                    
                                    <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-700/70 hover:bg-gray-600 text-white rounded-full p-2 z-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <img src={normalizeGCSUrl(images[currentImageIndex])} alt={`Heatmap ${currentImageIndex + 1}`} className="object-contain w-full h-full" />
                                    <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700/70 hover:bg-gray-600 text-white rounded-full p-2 z-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                                <div className="mt-4 text-gray-400 text-sm font-semibold">{currentImageIndex + 1} / {images.length}</div>
                            </>
                        ) : (
                            <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-gray-400 text-lg mb-2">No preview available</div>
                                    <div className="text-gray-500 text-sm">Heatmap preview is not available for this file</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Bottom Section: Analysis Results */}
                <div className="flex flex-col lg:flex-row gap-8 items-end">
                    {/* Analysis Results */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Audio Analysis - Show for video and audio content types */}
                            {(meta.content_type.toLowerCase() === 'audio' || meta.content_type.toLowerCase() === 'video') && (
                                <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                                    <div className="flex items-center mb-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                                        <h3 className="font-bold text-gray-200 text-lg">Audio Analysis</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {meta.label_audio && meta.score_audio !== null ? (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Label:</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                        meta.label_audio.toLowerCase() === 'real' 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                        {meta.label_audio.charAt(0).toUpperCase() + meta.label_audio.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Confidence Score:</span>
                                                    <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">
                                                        {meta.score_audio}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-4">
                                                <span className="text-gray-400 text-sm">Not available</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Video Analysis - Show for video content type only */}
                            {meta.content_type.toLowerCase() === 'video' && (
                                <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                                    <div className="flex items-center mb-3">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                                        <h3 className="font-bold text-gray-200 text-lg">Video Analysis</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {meta.label_video && meta.score_video !== null ? (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Label:</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                        meta.label_video.toLowerCase() === 'real' 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                        {meta.label_video.toLowerCase().replace(/^./, (char: string) => char.toUpperCase())}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Confidence Score:</span>
                                                    <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">
                                                        {meta.score_video}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-4">
                                                <span className="text-gray-400 text-sm">Not available</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Image Analysis - Show for image content type only */}
                            {meta.content_type.toLowerCase() === 'image' && (
                                <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                                    <div className="flex items-center mb-3">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 animate-pulse"></div>
                                        <h3 className="font-bold text-gray-200 text-lg">{meta.content_type.toLowerCase().replace(/^./, (char: string) => char.toUpperCase())} Analysis</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {meta.label_image && meta.score_image !== null ? (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Label:</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                        meta.label_image.toLowerCase() === 'real' 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                        {meta.label_image.toLowerCase().replace(/^./, (char: string) => char.toUpperCase())}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Confidence Score:</span>
                                                    <span className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">
                                                        {meta.score_image}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-4">
                                                <span className="text-gray-400 text-sm">Not available</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right: Heatmap Legend */}
                    <div className="flex-1 flex flex-col items-center">
                        <div className="w-full max-w-2xl">
                            <div className="space-y-2">
                                {/* Single Channel (Red to Green to Blue) */}
                                <div className="flex flex-col space-y-1">
                                    {/* Labels */}
                                    <div className="flex justify-between text-xs font-mono text-gray-300 bg-gradient-to-r from-gray-700/30 to-gray-800/30 px-2 py-1 rounded border border-gray-600/30">
                                        <span className="text-cyan-300 font-semibold">High Confidence</span>
                                        <span className="text-cyan-300 font-semibold">Low Confidence</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-600 via-green-300 to-blue-800 shadow-lg border border-gray-600/30" />
                                    <div className="flex justify-between text-xs font-mono text-gray-300 bg-gradient-to-r from-gray-700/30 to-gray-800/30 px-2 py-1 rounded border border-gray-600/30">
                                        <span className="text-red-400 font-semibold">Red</span>
                                        <span className="text-green-400 font-semibold">Green</span>
                                        <span className="text-blue-400 font-semibold">Blue</span>
                                    </div>
                                </div>
                            </div>

                            <p className="w-full text-gray-200 italic text-[10px] text-center mt-2 font-mono bg-gradient-to-r from-gray-700/20 to-gray-800/20 px-3 py-2 rounded border border-gray-600/20">
                            This heatmap pinpoints the regions factored into the confidence score calculation.                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Screen Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-md">
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 z-20 text-white hover:text-gray-300 transition-colors p-3 bg-gray-800/80 rounded-full hover:bg-gray-700/80"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="h-8 w-8"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {/* Full Screen Image */}
                        <img 
                            src={normalizeGCSUrl(images[currentImageIndex])} 
                            alt={`Heatmap ${currentImageIndex + 1} - Full View`} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisPage;