import React from "react";

interface CardProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isSelected: boolean;
}

const MediaCard: React.FC<CardProps> = ({ icon, label, onClick, isSelected }) => {
  return (
    <div
      className={`${
        isSelected ? "bg-gradient-to-br from-gray-900 via-black to-gray-950 border border-gray-100/100" : "bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-gray-500/40 "
      } rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center hover:bg-gradient-to-br hover:from-gray-800 hover:via-gray-900 hover:to-black transition-all duration-200 cursor-pointer text-center backdrop-blur-sm transform hover:-translate-y-1 hover:shadow-2xl relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.02] before:to-transparent before:rounded-2xl`}
      onClick={onClick}
    >
      {icon}
      <p className="mt-4 text-sm font-medium text-gray-200">{label}</p>
    </div>
  );
};

export default MediaCard;