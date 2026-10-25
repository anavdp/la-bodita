import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";

import { SearchProvider } from "../../search/SearchProvider";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useHasSidebar } from "./useIsPhone";

const collapsedStorageKey = "la-bodita.sidebarCollapsed";

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(collapsedStorageKey) === "true";
  } catch {
    return false;
  }
};

/**
 * The shell every screen sits in: fixed sidebar, top bar, fluid canvas. On a
 * laptop the sidebar's own button folds it down to its icons (remembered on this
 * browser); on a phone the top bar's menu button slides it in as a drawer.
 */
export function AppLayout() {
  const hasSidebar = useHasSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(collapsedStorageKey, String(next));
    } catch {
      // Without storage it simply opens unfolded next time.
    }
  };

  return (
    <ThemeProvider>
      <SearchProvider>
        <div className="flex min-h-screen bg-cream text-on-background">
          <Sidebar
            isOpen={isMenuOpen}
            isCollapsed={hasSidebar && isCollapsed}
            onToggleCollapsed={hasSidebar ? toggleCollapsed : undefined}
            onClose={closeMenu}
          />
          {/* `min-w-0`: a flex item defaults to min-width:auto and would otherwise
              refuse to shrink below the table's own width, widening the page. */}
          <main
            className={`min-h-screen min-w-0 flex-1 pb-12 transition-[margin] ${isCollapsed ? "md:ml-[88px]" : "md:ml-[260px]"}`}
          >
            <TopBar
              isMenuOpen={isMenuOpen}
              isSidebarCollapsed={isCollapsed}
              onOpenMenu={hasSidebar ? undefined : () => setIsMenuOpen(true)}
            />
            <div className="mx-auto max-w-[1440px] px-margin-mobile pt-28 md:px-margin-desktop">
              <Outlet />
            </div>
          </main>
        </div>
      </SearchProvider>
    </ThemeProvider>
  );
}
