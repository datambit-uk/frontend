import React from 'react';

interface CookieBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onReject }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-800 text-white p-4 flex flex-col md:flex-row justify-between items-center z-50 animate-slide-up">
      <p className="mb-2 md:mb-0">
        We use cookies to improve your experience. By using this site, you agree to our{" "}
        <a href="/cookie-policy" className="text-blue-400">cookie policy</a>.
      </p>
      <div className="flex">
        <button
          onClick={onAccept}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mr-2 transition-colors duration-200"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors duration-200"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default CookieBanner; 