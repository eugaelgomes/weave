const fs = require('fs');
const content = fs.readFileSync('app/(protected)/_components/layout/sidebar.tsx', 'utf8');

const imports = `import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";
import { UserAvatar, UserMenuContent } from "@/app/(protected)/_components/layout/user-menu";
`;

let newContent = content.replace(
  'import React, { useState, useEffect } from "react";',
  imports
);

newContent = newContent.replace(
  'CircleHelp,',
  'Search,'
);

const hooks = `
const useKeyboardShortcut = (key: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback]);
};

const useClickOutside = (refs: React.RefObject<HTMLElement | null>[], callback: () => void) => {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutside = refs.every((ref) => ref.current && !ref.current.contains(target));

      if (isOutside) {
        callback();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [refs, callback]);
};
`;

newContent = newContent.replace(
  '// ---------------------------------------------------------------------------',
  hooks + '\n// ---------------------------------------------------------------------------'
);

const newFooter = `// ---------------------------------------------------------------------------
// SidebarBottomActions
// ---------------------------------------------------------------------------

interface SidebarBottomActionsProps {
  isCollapsed: boolean;
  user: any;
  t: any;
  logout: () => void;
}

function SidebarBottomActions({ isCollapsed, user, t, logout }: SidebarBottomActionsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setMounted(true), []);

  useKeyboardShortcut("k", () => setIsSearchOpen(true));
  useClickOutside([desktopMenuRef, mobileMenuRef], () => setIsMenuOpen(false));

  return (
    <div className="shrink-0 px-1 pt-1 pb-1.5 flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        title={t.navbar?.searchSystem || "Pesquisar"}
        aria-label={t.navbar?.searchSystem || "Pesquisar"}
        className={cn(
          NAV_ROW_CLASS,
          "gap-2 px-2",
          "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
        )}
      >
        <span className={NAV_ICON_RAIL_CLASS}>
          <Search className="size-4 shrink-0 text-gray-800 dark:text-gray-400" />
        </span>
        <span
          className={cn(
            COLLAPSED_LABEL_CLASS,
            isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
          )}
        >
          <span className="truncate">{t.navbar?.searchSystem || "Pesquisar"}</span>
          {!isCollapsed && (
            <kbd className="ml-auto items-bottom flex gap-1 rounded px-1.5 font-sans text-[10px] font-medium text-gray-600 dark:text-gray-300">
              <span>⌘</span>K
            </kbd>
          )}
        </span>
      </button>

      <div className="relative w-full" ref={desktopMenuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title={t.navbar?.openUserMenu || "Usuário"}
          aria-label={t.navbar?.openUserMenu || "Usuário"}
          className={cn(
            NAV_ROW_CLASS,
            "gap-2 px-2",
            "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
          )}
        >
          <span className={NAV_ICON_RAIL_CLASS}>
            <UserAvatar user={user} size="xs" />
          </span>
          <span
            className={cn(
              COLLAPSED_LABEL_CLASS,
              isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
            )}
          >
            <span className="truncate">{user?.user_name || t.common?.user || "Usuário"}</span>
          </span>
        </button>

        {isMenuOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-72 origin-bottom-left sm:block">
            <div className="dark:border-surface-dark-border-strong overflow-hidden rounded-md border border-gray-200/60 bg-white shadow-lg dark:bg-[#1d1d1b]">
              <UserMenuContent
                user={user}
                t={t}
                onClose={() => setIsMenuOpen(false)}
                onLogout={logout}
              />
            </div>
          </div>
        )}
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {isMenuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:hidden">
            <div
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
            <dialog
              ref={mobileMenuRef}
              open
              className="dark:border-surface-dark-border-strong relative z-[111] m-0 flex w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xl dark:bg-[#1d1d1b]"
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <UserMenuContent
                  user={user}
                  t={t}
                  onClose={() => setIsMenuOpen(false)}
                  onLogout={logout}
                />
              </div>
              <footer className="dark:border-surface-dark-border-strong border-t border-neutral-200 bg-white p-3 dark:bg-[#1d1d1b]">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-200/50 py-2.5 text-xs font-bold text-neutral-900 active:scale-95 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  {t.navbar?.closeMenu || "Fechar"}
                </button>
              </footer>
            </dialog>
          </div>,
          document.body
        )}
    </div>
  );
}`;

const oldFooterStart = content.indexOf('// ---------------------------------------------------------------------------', content.indexOf('SidebarFooter'));
const oldFooterEnd = content.indexOf('// ---------------------------------------------------------------------------', oldFooterStart + 1);

// wait, the old footer is:
const oldFooterRegex = /\/\/ ---------------------------------------------------------------------------\n\/\/ SidebarFooter — link de ajuda\n\/\/ ---------------------------------------------------------------------------\n\ninterface SidebarFooterProps[\s\S]*?}\n/m;
newContent = newContent.replace(oldFooterRegex, newFooter + "\n");

// Then modify Sidebar to pass logout:
// const { authenticated, user } = useAuth();
// => const { authenticated, user, logout } = useAuth();
newContent = newContent.replace(
  'const { authenticated, user } = useAuth();',
  'const { authenticated, user, logout } = useAuth();'
);

newContent = newContent.replace(
  '<SidebarFooter isCollapsed={isCollapsed} helpLabel={t.footer.help} />',
  '<SidebarBottomActions isCollapsed={isCollapsed} user={user} t={t} logout={logout} />'
);

fs.writeFileSync('app/(protected)/_components/layout/sidebar.tsx', newContent);
