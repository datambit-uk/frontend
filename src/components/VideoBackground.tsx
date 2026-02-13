import React from 'react';
import datambitLogo from '/datambit_logo.png';
import { motion } from 'framer-motion';

interface VideoBackgroundProps {
  videoSrc: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoSrc }) => {
  return (
    <div className="hidden md:flex md:w-1/2 items-center justify-center bg-black relative overflow-hidden">
      <video
        className="w-full h-full object-cover absolute inset-0"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        onError={(e) => {
          const videoElement = e.target as HTMLVideoElement;
          console.error('Video Error:', {
            error: e,
            videoSrc: videoElement.currentSrc,
            networkState: videoElement.networkState,
            readyState: videoElement.readyState
          });
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.1) 90%, rgba(0,0,0,0) 100%)"
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 p-8 text-center">
        <motion.img
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          src={datambitLogo}
          alt="Datambit logo"
          className="w-96 h-auto"
        />
        <div className="max-w-2xl space-y-4">
          <motion.h2
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-4xl font-bold text-white mb-4 px-6 py-3 rounded-lg bg-black/70 backdrop-blur-sm"
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              AI-Powered Deepfake Detection
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="bg-gradient-to-r from-blue-300 to-blue-800 bg-clip-text text-transparent inline-block mt-5"
            >
              Real Truth, Real Time
            </motion.span>
          </motion.h2>
          {/* <motion.p
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="text-xl text-white px-6 py-3 rounded-lg bg-black/70 backdrop-blur-sm"
          >
            Detect and prevent deepfakes with our cutting-edge AI technology
          </motion.p> */}
        </div>
      </div>
    </div>
  );
};

export default VideoBackground; 