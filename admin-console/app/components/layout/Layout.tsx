"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/layout/Navbar";
import Sidebar from "@/app/components/layout/Sidebar";
import { useAuth } from "@/app/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, isLoading } = useAuth();
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-yellow-500" />
          <p className="text-sm text-neutral-500">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden ${
            isCollapsed ? "lg:w-[80px]" : "lg:w-[260px]"
          } flex-col border-r border-neutral-200 bg-white lg:flex transition-all duration-300`}
        >
          <Sidebar
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </aside>

        {/* Mobile Modal Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:hidden">
            <div
              className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={closeSidebar}
            />
            <div className="relative z-10 flex h-[85vh] w-full max-w-[90%] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="mx-auto min-h-full w-full bg-neutral-50 px-4 py-4 sm:px-4 lg:px-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
