"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, Check, Plus, Loader2, Building2, X } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  fetchMyOrganizations,
  type UserWorkspaceSummary,
  createOrganization,
} from "@/app/_services/organization";
import { cn } from "@/lib/utils";

export const WorkspaceSwitcher = () => {
  const { user, switchOrganization } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<UserWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeOrgName = user?.user_organization?.name || user?.org_name || "";
  const activeOrgUniqueName = user?.user_organization?.unique_name || user?.org_unique_name || "";
  const activeOrgLogo = user?.user_organization?.logo_url || user?.org_logo_url || null;
  const activeOrgId = user?.user_organization?.id || user?.org_id || null;

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyOrganizations();
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      loadWorkspaces();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeOrgId || switchingId) return;

    setSwitchingId(workspaceId);
    try {
      await switchOrganization(workspaceId);
    } catch (err) {
      console.error("Error switching workspace:", err);
      setSwitchingId(null);
    }
  };

  if (!activeOrgName && !activeOrgUniqueName) {
    return null;
  }

  return (
    <>
      <div className="relative ml-1.5 sm:ml-2" ref={containerRef}>
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={!!switchingId}
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-700 transition-all duration-150",
            "hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10",
            "focus-visible:ring-brand-primary-500/50 focus-visible:ring-2 focus-visible:outline-none",
            isOpen && "bg-black/5 dark:bg-white/10"
          )}
          aria-expanded={isOpen}
          aria-label="Switch workspace"
          title="Alternar organização"
        >
          {activeOrgLogo ? (
            <Image
              src={activeOrgLogo}
              alt={activeOrgName || activeOrgUniqueName}
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 rounded-sm object-contain"
            />
          ) : (
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-neutral-700 dark:text-gray-300">
              {(activeOrgName || activeOrgUniqueName || "O").charAt(0).toUpperCase()}
            </div>
          )}

          <span className="max-w-[90px] truncate text-gray-700 sm:max-w-[150px] dark:text-gray-200">
            {activeOrgName || activeOrgUniqueName}
          </span>

          {switchingId ? (
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
          ) : (
            <ChevronDown
              className={cn(
                "h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300",
                isOpen && "rotate-180"
              )}
            />
          )}
        </button>

        {isOpen && (
          <div className="animate-in fade-in-50 zoom-in-95 absolute top-full left-0 z-50 mt-1.5 w-60 origin-top-left rounded-xl border border-gray-200/80 bg-white/95 p-1 shadow-2xl backdrop-blur-lg transition-all dark:border-white/10 dark:bg-[#20201e]/95">
            {loading && workspaces.length === 0 ? (
              <div className="flex items-center justify-center p-4 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="text-brand-primary-500 mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="max-h-56 space-y-0.5 overflow-y-auto">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeOrgId;
                  const isCurrentlySwitching = ws.id === switchingId;

                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSelectWorkspace(ws.id)}
                      disabled={isCurrentlySwitching || isActive}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-150",
                        isActive
                          ? "bg-black/5 font-semibold text-gray-900 dark:bg-white/10 dark:text-white"
                          : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {ws.logo_url ? (
                          <Image
                            src={ws.logo_url}
                            alt={ws.org_name || ws.unique_name}
                            width={20}
                            height={20}
                            className="h-5 w-5 shrink-0 rounded object-contain"
                          />
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                            {(ws.org_name || ws.unique_name || "O").charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                            {ws.org_name}
                          </span>
                          <span className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                            @{ws.unique_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {isCurrentlySwitching ? (
                          <Loader2 className="text-brand-primary-500 h-3.5 w-3.5 animate-spin" />
                        ) : isActive ? (
                          <Check className="h-3.5 w-3.5 text-gray-900 dark:text-white" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-1 border-t border-gray-100 pt-1 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/account/onboarding?step=2";
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Plus className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Criar workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
