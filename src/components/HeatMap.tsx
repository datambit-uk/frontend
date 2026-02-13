import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeatmapData {
  images: string[];
  label_audio: string;
  label_image: string;
  label_video: string;
  score_audio: number;
  score_video: number;
  score_image: number;
}

interface ModalProps extends HeatmapData {
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  images,
  label_audio,
  label_image,
  label_video,
  score_audio,
  score_video,
  score_image,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const heatmapEl = useRef(null);
  const [isCloseLable, setIsCloseLable] = useState(false);
  const [isDownload, setIsDownload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [rotation, setRotation] = useState(0);

  const rotateImage = () => {
    setRotation((prevRotation) => prevRotation + 90);
  };

  const handleCloseIsHovered = () => {
    setIsCloseLable(true);
  };

  const handleCloseIsLeave = () => {
    setIsCloseLable(false);
  };

  const handleHoverDownload = () => {
    setIsDownload(true);
  };

  const handleCloseDownload = () => {
    setIsDownload(false);
  };

  const handlePrevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSlideDirection('right');
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setRotation(0);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleNextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSlideDirection('left');
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setRotation(0);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (heatmapEl.current && !(heatmapEl.current as HTMLElement).contains(event.target as Node)) {
      onClose();
    }
  };

  const normalizeGCSUrl = (url: string) => {

    if (url.startsWith("gs://")) {
      url = url.replace("gs://genui-storage/", "https://storage.googleapis.com/genui-storage/");
    }
    console.log(url)
    return url;
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

      const filePath = url
        .split('/heatmaps/')[1]
        ?.split('?')[0]
        ?.split('/')
        .pop()
        ?.split('.')
        .slice(0, -1)
        .join('.');
      if (filePath) {
        const fileName = filePath.replace(/\//g, '_');
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${fileName}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(imageUrl);
      } else {
        throw new Error();
      }
    } catch (error) {
      console.log(error);
      alert("Something went wrong! Please try again later.");
    }

    setIsDownloading(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate the indices for previous and next images
  const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
  const nextIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
      <div
        className="bg-gray-900 w-full h-full sm:w-[70%] sm:h-[80%] lg:w-[60%] lg:h-[80%] rounded-lg shadow-lg flex flex-col justify-center items-center relative"
        ref={heatmapEl}
      >
        {/* Header */}
        <div className="text-white text-2xl font-extrabold w-full px-8 py-4 border-b-4 border-white flex justify-center items-center">
          <div className="flex flex-row space-x-6">
            {/* Video Section */}
            {label_video && (
              <div className="flex flex-col items-start">
                <p className="text-lg font-bold text-white mb-1">Video Analysis</p>
                <div className="flex items-center mb-1">
                  <p className="text-base mr-2">Label:</p>
                  <p
                    className={`text-base font-bold ${
                      label_video.toLowerCase() === "fake" ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {label_video}
                  </p>
                </div>
                <p className="text-base">Score: {score_video}</p>
              </div>
            )}

            {/* Audio Section */}
            {label_audio && (
              <div className="flex flex-col items-start">
                <p className="text-lg font-bold text-white mb-1">Audio Analysis</p>
                <div className="flex items-center mb-1">
                  <p className="text-base mr-2">Label:</p>
                  <p
                    className={`text-base font-bold ${
                      label_audio.toLowerCase() === "fake" ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {label_audio}
                  </p>
                </div>
                <p className="text-base">Score: {score_audio}</p>
              </div>
            )}

            {/* Image Section */}
            {(!label_video && !label_audio && label_image) && (
              <div className="flex flex-col items-start">
                <p className="text-lg font-bold text-white mb-1">Image Analysis</p>
                <div className="flex items-center mb-1">
                  <p className="text-base mr-2">Label:</p>
                  <p
                    className={`text-base font-bold ${
                      label_image.toLowerCase() === "fake" ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {label_image}
                  </p>
                </div>
                <p className="text-base">Score: {score_image}</p>
              </div>
            )}
          </div>
        </div>

        {/* Image Carousel */}
        <div className="relative w-full h-[50vh] px-8 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Previous Image */}
            <div
              className={`absolute w-full h-full transition-transform duration-100 ease-in-out ${
                slideDirection !== 'right' && isTransitioning ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'
              }`}
            >
              <img
                ref={imageRef}
                src={normalizeGCSUrl(images[prevIndex])}
                alt={`Previous Image`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Current Image */}
            <div
              className={`absolute w-full h-full transition-transform duration-200 ease-in-out ${
                isTransitioning
                  ? slideDirection !== 'left'
                    ? '-translate-x-full opacity-0'
                    : 'translate-x-full opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}
            >
              <img
                src={normalizeGCSUrl(images[nextIndex])}
                alt={`Current Image`}
                className="w-full h-full object-contain rounded-md"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>

            {/* Next Image */}
            <div
              className={`absolute w-full h-full transition-transform duration-500 ease-in-out ${
                slideDirection === 'left' && isTransitioning ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'
              }`}
            >
              <img
                src={normalizeGCSUrl(images[nextIndex])}
                alt={`Next Image`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={handlePrevImage}
              disabled={currentImageIndex === 0}
              className="absolute left-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNextImage}
              disabled={currentImageIndex === images.length - 1}
              className="absolute right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>

        {/* Rotate image */}
        <div className="mt-4">
          <button
            onClick={rotateImage}
            className="p-2 text-white hover:text-gray-300 transition"
          >
            <svg
              className="w-5 h-5 transition-transform duration-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.624" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
        </div>

        {/* Heatmap Legend */}
        <div className="w-full max-w-2xl mt-8 px-8 pb-6 mb-2">
          <div className="space-y-4">
            {/* Single Channel (Red to Green to Blue) */}
            <div className="flex flex-col space-y-1">
              {/* Labels */}
              <div className="flex justify-between text-md text-gray-300">
                <span>High</span>
                <span>Low</span>
              </div>
              <div className="h-4 w-full rounded-full bg-gradient-to-r from-red-600 via-green-300 to-blue-800" />
              <div className="flex justify-between text-sm text-gray-300">
                <span>Red</span>
                <span>Green</span>
                <span>Blue</span>
              </div>
            </div>
          </div>

          <p className="w-full text-gray-200 italic text-sm text-center mt-2">
            The HeatMap here visualises the areas that have been taken into account for assessing the confidence score. Along with a customised report it allows for explainability of result and transparency as good ethical practice.
          </p>
        </div>

        {/* Close Button */}
        <div className="container">
          <button
            onClick={onClose}
            onMouseEnter={handleCloseIsHovered}
            onMouseLeave={handleCloseIsLeave}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl transition-colors sm:px-2 sm:py-2 lg:px-8 lg:py-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          {isCloseLable && (
            <div className="absolute top-12 right-4 bg-gray-800 text-white text-sm px-2 py-1 rounded shadow-lg">
              Close
            </div>
          )}
        </div>

        <div className="container">
          <button
            onClick={() => downloadImage(images[currentImageIndex])}
            onMouseEnter={handleHoverDownload}
            onMouseLeave={handleCloseDownload}
            disabled={isDownloading}
            className="absolute top-4 left-4 text-white hover:text-gray-300 text-2xl transition-colors sm:px-2 sm:py-2 lg:px-8 lg:py-4 disabled:opacity-50"
          >
            {isDownloading ? (
              <svg
                className="animate-spin size-6"
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
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            )}
          </button>
          {isDownload && !isDownloading && (
            <div className="absolute top-12 left-4 bg-gray-800 text-white text-sm px-2 py-1 rounded shadow-lg">
              Save Heatmap
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;