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

  const appPreferences = (user?.usage_preference as any);
  const appBackgroundColor: string | undefined =
    appPreferences?.Display?.appBackgroundColor ||
    appPreferences?.display?.appBackgroundColor ||
    undefined;

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
    <div
      className="flex h-screen flex-col"
      style={appBackgroundColor ? { backgroundColor: appBackgroundColor } : undefined}
    >
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`hidden min-h-0 flex-col ${
            isCollapsed ? "lg:w-[70px]" : "lg:w-[160px]"
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
              className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
              onClick={closeSidebar}
            />

            <div className="relative z-[101] flex h-[85vh] min-h-0 w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:border-neutral-800 dark:bg-neutral-900">
              <Sidebar
                onLinkClick={closeSidebar}
                isCollapsed={false}
                toggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}

        <div
          className="bg-brand-secondary-100 dark:bg-brand-secondary-950/80 min-h-0 flex-1 overflow-y-auto scroll-smooth rounded-md border border-t-2 border-neutral-200 p-2 shadow-[0_4px_6px_-1px_rgb(0_0_0/0.1),0_2px_4px_-2px_rgb(0_0_0/0.1),inset_0_2px_8px_rgb(0_0_0/0.06)] md:mr-2 md:mb-2 dark:border-neutral-800 dark:shadow-[0_4px_6px_-1px_rgb(0_0_0/0.25),0_2px_4px_-2px_rgb(0_0_0/0.2),inset_0_2px_10px_rgb(0_0_0/0.35)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="animate-in fade-in slide-in-from-bottom-2 flex min-h-full flex-col gap-2 duration-500">
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
