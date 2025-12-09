"use client";

import React, { useState } from "react";
import Navbar from "@/app/components/layout/navbar";
import Sidebar from "@/app/components/layout/sidebar";
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
        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 flex-col bg-neutral-900 transition-transform duration-300 ease-in-out sm:w-80 lg:static lg:z-auto lg:w-[240px] lg:translate-x-0 lg:bg-transparent lg:shadow-none ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} pt-14 sm:pt-16 lg:pt-0`}
        >
          <div className="h-full py-2 sm:p-3 lg:h-full lg:p-0">
            <Sidebar onLinkClick={closeSidebar} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-neutral-950">
          <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-2 sm:px-6 lg:px-8">
            <div className="mx-auto h-full w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
