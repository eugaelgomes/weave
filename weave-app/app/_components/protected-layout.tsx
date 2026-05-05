"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/app/(protected)/_components/layout/navbar";
import Sidebar from "@/app/(protected)/_components/layout/sidebar";
import PagesFooter from "@/app/(protected)/_components/layout/footer";
import WeaveAi from "@/app/(protected)/_components/layout/WeaveAi";
import { useAuth } from "@/app/_contexts/auth-context";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user } = useAuth();


  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-[#050505]">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`hidden min-h-0 flex-col ${
            isCollapsed ? "lg:w-[70px]" : "lg:w-[170px]"
          } transition-all duration-300 lg:flex`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-sm"
              onClick={closeSidebar}
            />

            <div className="relative z-[101] flex h-[85vh] min-h-0 w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-gray-800 bg-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-950/80">
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth rounded-md border border-gray-200 bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_2px_8px_rgba(0,0,0,0.04)] md:mr-2 md:mb-2 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),inset_0_2px_10px_rgba(0,0,0,0.3)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="flex min-h-full flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

            <PagesFooter />
          </div>
        </div>
      </div>

      <WeaveAi />
    </div>
  );
};

export default ProtectedLayout;
