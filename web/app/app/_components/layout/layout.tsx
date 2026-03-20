"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/app/_components/layout/navbar";
import Sidebar from "@/app/app/_components/layout/sidebar";
import PagesFooter from "./footer";

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
        {/* Desktop Sidebar */}
        <aside
          className={`hidden ${isCollapsed ? "lg:w-[70px]" : "lg:w-[180px]"} flex-col bg-neutral-50 lg:flex dark:border-neutral-800 dark:bg-neutral-950`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </aside>

        {/* Mobile Modal Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
            {/* Overlay */}
            <div
              className="animate-in fade-in absolute inset-0 bg-neutral-950/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={closeSidebar}
            />

            {/* Modal Container */}
            <div
              className="animate-in fade-in zoom-in-95 relative z-10 flex h-[85vh] w-full max-w-[90%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] duration-300 dark:border-neutral-800 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="no-scrollbar flex-1 overflow-y-auto scroll-smooth rounded-tl-lg border-t-3 border-l border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto flex min-h-full w-full flex-col bg-neutral-100 px-2 py-2 sm:px-2 sm:py-2 lg:px-2 lg:py-2 dark:bg-neutral-900">
              <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col space-y-2 duration-500">
                <div className="flex-1">{children}</div>
                <PagesFooter />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
