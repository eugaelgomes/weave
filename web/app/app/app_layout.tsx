"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/app/_components/layout/navbar";
import Sidebar from "@/app/app/_components/layout/sidebar";
import PagesFooter from "./_components/layout/footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <div className="dark:bg-brand-secondary-950 flex h-screen flex-col bg-white">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div
          className={`hidden ${
            isCollapsed ? "lg:w-[70px]" : "lg:w-[160px]"
          } dark:bg-brand-secondary-950 flex-col bg-white transition-all duration-300 lg:flex`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </div>

        {/* Mobile Centered Sidebar Modal */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
              onClick={closeSidebar}
            />

            <div className="relative z-[101] flex h-[85vh] w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:border-neutral-800 dark:bg-neutral-900">
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        <div className="bg-brand-secondary-100 md:mr-2 md:mb-2 dark:bg-brand-secondary-950/60 min-h-0 flex-1 overflow-y-auto scroll-smooth rounded-md border-t-2 border border-neutral-200 p-2 dark:border-neutral-800 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="animate-in fade-in slide-in-from-bottom-2 flex min-h-full flex-col gap-2 duration-500">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

            <PagesFooter />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
