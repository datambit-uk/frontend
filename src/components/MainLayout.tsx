import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./SideBar";
import { useAuth } from "../auth/AuthenticationContent";

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-gradient-to-r from-black via-black to-[#0a1f44] text-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} logout={logout} />

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
