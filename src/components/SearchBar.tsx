import React, { KeyboardEvent } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchClick?: () => void;
  error?: string | null;
  onErrorClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearchClick,
  error,
  onErrorClear
}) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearchClick) {
      onSearchClick();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    if (newValue === '' && error && onErrorClear) {
      onErrorClear();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Upload Id....."
          className={`w-full bg-gray-800/80 text-gray-100 pl-10 pr-12 py-2 rounded-xl border ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
          } outline-none transition-all duration-200 placeholder-gray-500`}
          value={searchQuery}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />
        <Search 
          className={`w-5 h-5 ${error ? 'text-red-400' : 'text-gray-400'} absolute left-3 top-1/2 transform -translate-y-1/2`} 
        />
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${
              error ? 'bg-red-500/90 hover:bg-red-600' : 'bg-blue-500/90 hover:bg-blue-600'
            } text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-95`}
            aria-label="Search"
          >
            <Search className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}
      </div>
      {error && (
        <div className="absolute mt-1 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
