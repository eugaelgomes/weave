"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/app/components/layout/navbar";
import Sidebar from "@/app/app/components/layout/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState === "true") setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`fixed top-0 left-0 z-50 h-full flex-col border-r border-neutral-200 bg-white transition-all duration-300 ease-in-out dark:border-neutral-800 dark:bg-neutral-950 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} ${isCollapsed ? "lg:w-[80px]" : "lg:w-[260px]"} pt-16 lg:static lg:flex lg:translate-x-0 lg:pt-0 lg:shadow-none`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="no-scrollbar flex-1 overflow-y-auto scroll-smooth">
            <div className="mx-auto min-h-full w-full px-4 py-2 bg-neutral-200">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
