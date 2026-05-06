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
    <div className="flex h-screen flex-col bg-[#131314]">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`hidden min-h-0 flex-col ${
              isCollapsed ? "lg:w-[60px]" : "lg:w-[170px]"
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

          {/* Main column only (sidebar is a sibling): panel + footer aligned to main width */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden gap-1 md:mr-1.5 md:mb-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md  bg-white/20 p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_2px_8px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),inset_0_2px_10px_rgba(0,0,0,0.3)]">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {children}
                </div>
              </div>
            </div>

            <div className="mt-px shrink-0">
              <PagesFooter />
            </div>
          </div>
        </div>
      </div>

      <WeaveAi />
    </div>
  );
};

export default ProtectedLayout;
