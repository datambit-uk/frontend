import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, LifeBuoy, LogOut, Clock, FolderOpen } from "lucide-react"; 

interface SidebarProps {
  isOpen: boolean;
  logout: () => void;
}

const navItems = [
  { label: "Home", path: "/home", icon: <Home className="w-6 h-6" /> },
  { label: "Recent Upload", path: "/recent-upload", icon: <Clock className="w-6 h-6" /> },
  { label: "All Uploads", path: "/all-uploads", icon: <FolderOpen className="w-6 h-6" /> },
  { label: "Support", path: "/support", icon: <LifeBuoy className="w-6 h-6" /> },
  // { label: "Get Started", path: "/get-started", icon: <Rocket className="w-6 h-6" /> },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, logout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`
        fixed md:relative top-0 left-0 
        w-64 md:w-72
        h-screen
        bg-[#060C0C]
        shadow-[4px_0_24px_rgba(0,0,0,0.25)]
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        border-r border-gray-800/50
        flex flex-col
        z-40
      `}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-center">
          <img 
            src="/datambit_logo.png" 
            alt="Datambit Logo" 
            className="w-full h-12 object-contain"
          />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`
              w-full flex items-center space-x-3 px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                location.pathname === item.path
                  ? "bg-blue-600/20 text-blue-400 shadow-md"
                  : "text-white hover:bg-gray-800/50 hover:text-gray-200"
              }
            `}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-6 border-t border-gray-800/50">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-800/50 hover:text-gray-200 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-6 h-6" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
