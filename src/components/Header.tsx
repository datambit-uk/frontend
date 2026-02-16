import React, { useState } from "react";
import { User, Menu } from "lucide-react";

import SearchBar from "./SearchBar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthenticationContent";

interface HeaderProps {
  onSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const validateCUID2 = (id: string): boolean => {
    // CUID2 is 24 characters long and contains only lowercase letters and numbers
    const cuid2Regex = /^[a-z0-9]{24}$/;
    return cuid2Regex.test(id);
  };

  const handleSearch = () => {
    // Reset error state
    setSearchError(null);

    // Trim the search query
    const trimmedQuery = searchQuery.trim();

    // Check if empty
    if (!trimmedQuery) {
      setSearchError("Please enter an Upload ID");
      return;
    }

    // Validate CUID2 format
    if (!validateCUID2(trimmedQuery)) {
      setSearchError("Invalid Upload ID format");
      return;
    }

    // Navigate to report detail page with the upload ID
    navigate(`/report/${trimmedQuery}`);
    
    // Clear search after navigation
    setSearchQuery("");
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      const dropdown = document.getElementById("profile-dropdown");
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <header className="m-4 bg-gray-900/90 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-sm h-[72px] flex items-center z-50">
      <div className="w-full flex items-center justify-between px-6 gap-4">
        {/* Menu Button for Mobile */}
        <button
          onClick={onSidebarToggle}
          className="md:hidden p-2 text-gray-300 hover:text-white bg-gray-800/80 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo - Only visible on mobile */}
        <div className="md:hidden">
          <img 
            src={import.meta.env.BASE_URL + 'datambit_logo.png'}
            alt="Datambit Logo"
            className="h-8 w-auto"
          />
        </div>

        {/* Search Section */}
        <div className="hidden md:block flex-1 max-w-xl">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchClick={handleSearch}
            error={searchError}
            onErrorClear={() => setSearchError(null)}
          />
        </div>

        {/* Right Section - Notifications and Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Button */}
          {/* <button className="relative p-2 text-gray-300 hover:text-white bg-gray-800/80 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button> */}

          {/* Profile Button with Dropdown */}
          <div className="relative">
            <button
              className="p-2 text-gray-300 hover:text-white bg-gray-800/80 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </button>
            {dropdownOpen && (
              <div
                id="profile-dropdown"
                className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-50 py-2"
              >
                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-red-400 rounded-lg transition-all duration-150"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
