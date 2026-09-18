"use client";

import React, { useEffect, useState } from "react";

import Sidebar from "@/app/(protected)/_components/layout/sidebar";

import { cn } from "@/lib/utils";

import Navbar from "@/app/(protected)/_components/layout/navbar";
import SettingsModal from "@/app/(protected)/_components/modals/settings/settings-modal";
import Breadcrumb from "@/app/(protected)/_components/layout/breadcrumb";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  useEffect(() => {
    const syncSettingsModal = () => {
      setIsSettingsOpen(window.location.hash.startsWith("#settings"));
    };

    syncSettingsModal();
    window.addEventListener("hashchange", syncSettingsModal);
    return () => window.removeEventListener("hashchange", syncSettingsModal);
  }, []);

  const closeSettingsModal = () => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setIsSettingsOpen(false);
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-white dark:bg-[#1d1d1b]">
      <Navbar onToggleSidebar={toggleSidebar} isCollapsed={isCollapsed} />

      <div className="relative flex flex-1 flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <div
          className={`hidden min-h-0 shrink-0 flex-col ${
            isCollapsed ? "lg:w-[64px]" : "lg:w-[240px]"
          } overflow-hidden transition-[width] duration-300 ease-in-out lg:flex`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {sidebarOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <button
                type="button"
                aria-label="Fechar menu lateral"
                className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs transition-opacity"
                onClick={closeSidebar}
              />
              <div className="animate-in slide-in-from-left fixed inset-y-0 left-0 z-[101] flex w-[260px] max-w-[85vw] flex-col overflow-hidden bg-white shadow-2xl duration-300 dark:bg-[#1d1d1b]">
                <Sidebar
                  onLinkClick={closeSidebar}
                  isCollapsed={false}
                  toggleCollapse={toggleCollapse}
                />
              </div>
            </div>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0 lg:pr-2 lg:pb-2">
            <div
              className={cn(
                "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain rounded-lg border-2 border-gray-200 bg-white dark:border-white/10 dark:bg-[#1d1d1b]"
              )}
            >
              <div
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-2 flex min-h-full w-full min-w-0 flex-1 flex-col duration-500"
                )}
              >
                <div className="px-4 pt-2 sm:px-6 sm:pt-3">
                  <Breadcrumb />
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettingsModal} />
    </div>
  );
};

export default ProtectedLayout;
