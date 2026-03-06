"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaCreditCard,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { IconType } from "react-icons";

interface SidebarProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavigationItem {
  path: string;
  icon: IconType;
  label: string;
}

const Sidebar = ({ onLinkClick, isCollapsed = false, toggleCollapse }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navigationItems: NavigationItem[] = [
    { path: "/", icon: FaHome, label: "Dashboard" },
    { path: "/users", icon: FaUsers, label: "Usuários" },
    { path: "/organizations", icon: FaBuilding, label: "Organizações" },
    { path: "/plans", icon: FaCreditCard, label: "Planos" },
  ];

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto bg-neutral-50 py-4 dark:bg-neutral-950">
      <nav className="space-y-1 px-3">
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onLinkClick}
              className={`group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm dark:bg-primary/20 dark:text-primary dark:shadow-none"
                  : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <item.icon
                className={`flex-shrink-0 transition-all duration-200 ${
                  active
                    ? "text-primary-foreground dark:text-primary"
                    : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                } ${isCollapsed ? "mr-0 h-6 w-6" : "mr-3 h-5 w-5"}`}
              />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button (Desktop Only) */}
      <div className="hidden border-t border-neutral-200 p-4 lg:block dark:border-neutral-800">
        <button
          onClick={toggleCollapse}
          className="flex w-full items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          {isCollapsed ? (
            <FaChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2">
              <FaChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Recolher</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
