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
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState === "true") setIsCollapsed(true);
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
    <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden ${
            isCollapsed ? "lg:w-[70px]" : "lg:w-[180px]"
          } flex-col bg-neutral-50 lg:flex dark:bg-neutral-950`}
        >
          <Sidebar
            onLinkClick={closeSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </aside>

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

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="no-scrollbar flex-1 overflow-y-auto scroll-smooth rounded-tl-lg border-l border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto flex min-h-full w-full flex-col bg-neutral-100 px-2 py-2 dark:bg-neutral-900">
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