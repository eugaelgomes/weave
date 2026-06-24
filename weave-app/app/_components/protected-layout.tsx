"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import Navbar from "@/app/(protected)/_components/layout/navbar";
import Sidebar from "@/app/(protected)/_components/layout/sidebar";
import WeaveAi from "@/app/(protected)/_components/layout/WeaveAi";
import { cn } from "@/lib/utils";

const LG_MEDIA = "(min-width: 1024px)";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLg, setIsLg] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(LG_MEDIA).matches : false
  );
  useLayoutEffect(() => {
    const mq = window.matchMedia(LG_MEDIA);
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-[#F3F3F3] dark:bg-[#1d1d1b]">
      {/* Desktop Sidebar - Full Height */}
      <div
        className={`hidden min-h-0 shrink-0 flex-col ${
          isCollapsed ? "lg:w-16" : "lg:w-[170px]"
        } transition-[width] duration-300 ease-out lg:flex`}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-sm"
              onClick={closeSidebar}
            />
            <div className="dark:border-surface-dark-border dark:shadow-surface-dark-xl relative z-[101] flex h-[85vh] min-h-0 w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl ring-1 ring-black/5 dark:bg-[#1d1d1b] dark:ring-white/10">
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        {/* Mobile Sidebar modal stays outside the regular flow but inside relative/fixed positioning */}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl md:mt-1 md:mr-1 md:mb-1">
          <div
            className={cn(
              "dark:border-surface-dark-border dark:shadow-surface-dark-md flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] dark:bg-zinc-900 dark:ring-white/[0.03]"
            )}
          >
            <div className="shrink-0 border-b border-neutral-100 dark:border-neutral-800">
              <Navbar onToggleSidebar={toggleSidebar} isCollapsed={isCollapsed} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-1.5">
              <div
                className={cn(
                  "flex min-h-0 w-full min-w-0 flex-col overflow-hidden",
                  isLg ? "flex-1" : "max-lg:flex-none"
                )}
              >
                <div
                  className={cn(
                    "animate-in fade-in slide-in-from-bottom-2 flex min-h-0 w-full min-w-0 flex-col gap-2 duration-500",
                    isLg ? "flex-1" : "max-lg:min-h-[calc(100dvh-9rem)] max-lg:flex-none"
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WeaveAi />
    </div>
  );
};

export default ProtectedLayout;
