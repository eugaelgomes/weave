"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Briefcase,
  LayoutGrid,
  Settings,
  FileText,
  Folder,
  Home,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useLanguage } from "@/app/_contexts/language-context";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  type: "project" | "group" | "page" | "recent" | "note";
  icon: React.ElementType;
  subtitle?: string;
  href: string;
  color?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { notesOverview } = useNotes();
  const { projectsOverview } = useProjects();
  const { t } = useLanguage();
  const searchT = t.navbar.searchModal;

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const places: SearchResult[] = [
    { id: "1", title: searchT.placeHome, type: "page", icon: Home, href: "/home" },
    {
      id: "2",
      title: searchT.placeExplore,
      type: "page",
      icon: LayoutGrid,
      href: "/weave-engine",
    },
    {
      id: "4",
      title: searchT.placePreferences,
      type: "page",
      icon: Settings,
      href: "/settings",
    },
  ];

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return { notes: [], projects: [] };

    const term = searchTerm.toLowerCase();

    const matchedNotes: SearchResult[] = notesOverview
      .filter(
        (note) =>
          note.title.toLowerCase().includes(term) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(term))
      )
      .slice(0, 5)
      .map((note) => ({
        id: `note-${note.id}`,
        title: note.title,
        type: "note",
        icon: FileText,
        subtitle:
          note.tags && note.tags.length > 0 ? `#${note.tags.join(", #")}` : searchT.noteFallback,
        href: `/notes/${note.public_id || note.id}`,
      }));

    const matchedProjects: SearchResult[] = projectsOverview
      .filter(
        (project) =>
          project.title.toLowerCase().includes(term) ||
          project.description?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((project) => ({
        id: `project-${project.id}`,
        title: project.title,
        type: "project",
        icon: Folder,
        subtitle: project.status || searchT.projectFallback,
        href: `/projects/${project.public_id || project.id}`,
        color: project.color,
      }));

    return { notes: matchedNotes, projects: matchedProjects };
  }, [searchTerm, notesOverview, projectsOverview, searchT.noteFallback, searchT.projectFallback]);

  if (!mounted || !isOpen) return null;

  const recentProjects: SearchResult[] = projectsOverview.slice(0, 3).map((p) => ({
    id: `recent-p-${p.id}`,
    title: p.title,
    type: "project",
    icon: Folder,
    subtitle: p.status,
    href: `/projects/${p.public_id || p.id}`,
    color: p.color,
  }));

  const recentNotes: SearchResult[] = notesOverview.slice(0, 3).map((n) => ({
    id: `recent-n-${n.id}`,
    title: n.title,
    type: "note",
    icon: FileText,
    subtitle: n.tags?.[0] ? `#${n.tags[0]}` : searchT.noteFallback,
    href: `/notes/${n.public_id || n.id}`,
  }));

  const Section = ({
    title,
    items,
    emptyMessage,
    viewAllLabel,
    viewAllHref,
  }: {
    title: string;
    items: SearchResult[];
    emptyMessage?: string;
    viewAllLabel?: string;
    viewAllHref?: string;
  }) => (
    <div className="mb-4">
      <h3 className="px-4 py-2 text-xs font-bold tracking-wider text-neutral-500">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <item.icon
                  className={`h-4 w-4 ${item.color ? "" : "text-neutral-400"}`}
                  style={item.color ? { color: item.color } : {}}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-[10px] text-neutral-400">{item.subtitle}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-2 text-xs text-neutral-400 italic">
          {emptyMessage || searchT.noItemsFound}
        </p>
      )}
      {viewAllLabel && items.length > 0 && (
        <Link
          href={viewAllHref || "#"}
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-600 transition-colors hover:text-yellow-600"
        >
          <LayoutGrid className="h-3 w-3" />
          {viewAllLabel}
        </Link>
      )}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:px-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all dark:bg-[#1d1d1b] dark:ring-white/10">
        {/* Search Input Header */}
        <div className="dark:border-surface-dark-border flex items-center border-b border-neutral-200 px-4">
          <Search className="text-brand-primary-500 h-5 w-5" />
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full border-0 bg-transparent px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus:outline-none dark:text-neutral-100"
            placeholder={searchT.inputPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            title={searchT.filterButtonLabel}
            aria-label={searchT.filterButtonLabel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="no-scrollbar max-h-[60vh] overflow-y-auto py-2">
          {searchTerm === "" ? (
            <>
              <Section title={searchT.places} items={places} />
              <Section
                title={searchT.recentProjects}
                items={recentProjects}
                emptyMessage={searchT.projectsEmpty}
                viewAllLabel={searchT.allProjects}
                viewAllHref="/projects"
              />
              <Section
                title={searchT.recentNotes}
                items={recentNotes}
                emptyMessage={searchT.notesEmpty}
                viewAllLabel={searchT.allNotes}
                viewAllHref="/notes"
              />
            </>
          ) : (
            <>
              {filteredResults.projects.length > 0 && (
                <Section title={searchT.projects} items={filteredResults.projects} />
              )}
              {filteredResults.notes.length > 0 && (
                <Section title={searchT.notes} items={filteredResults.notes} />
              )}

              {filteredResults.projects.length === 0 && filteredResults.notes.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
                  <p className="text-sm text-neutral-500">
                    {searchT.noResultTitle.replace("{term}", searchTerm)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{searchT.noResultDescription}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="dark:border-surface-dark-border flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-4 py-2 text-[10px] text-neutral-400 dark:bg-[#1d1d1b]/50">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <kbd className="dark:border-surface-dark-border-strong rounded border border-neutral-200 bg-white px-1 dark:bg-neutral-800">
                ESC
              </kbd>{" "}
              {searchT.escToClose}
            </span>
            <span className="flex hidden items-center gap-1 sm:flex">
              <kbd className="dark:border-surface-dark-border-strong rounded border border-neutral-200 bg-white px-1 dark:bg-neutral-800">
                ↑↓
              </kbd>{" "}
              {searchT.arrowsToNavigate}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="dark:border-surface-dark-border-strong rounded border border-neutral-200 bg-white px-1 dark:bg-neutral-800">
                ↵
              </kbd>{" "}
              {searchT.enterToOpen}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchModal;
