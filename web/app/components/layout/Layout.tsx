"use client";

import React, { useState } from "react";
import Navbar from "@/app/components/layout/Navbar";
import Sidebar from "@/app/components/layout/Sidebar";
import { useAuth } from "@/app/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { authenticated } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!authenticated) {
    return <div className="min-h-screen bg-neutral-950">{children}</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Overlay para mobile quando sidebar está aberta */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} />
        )}

        {/* Sidebar como aside em desktop */}
        <aside
          className={`fixed z-50 transition-all duration-300 ease-in-out lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} top-0 left-0 flex h-full w-64 flex-col bg-neutral-900 pt-14 sm:pt-16 lg:top-auto lg:left-auto lg:block lg:translate-x-0 lg:bg-transparent lg:pt-0 lg:shadow-none`}
        >
          <div className="h-full p-2 lg:p-4">
            <Sidebar onLinkClick={closeSidebar} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-0">
          <div className="no-scrollbar flex-1 overflow-y-auto p-4">
            <div className="mx-auto h-full max-w-full">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
