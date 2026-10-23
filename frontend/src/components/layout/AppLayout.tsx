import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";

import { SearchProvider } from "../../search/SearchProvider";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The shell every screen sits in: fixed sidebar, top bar, fluid canvas. On a phone the sidebar is a menu drawer. */
export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <ThemeProvider>
      <SearchProvider>
        <div className="flex min-h-screen bg-cream text-on-background">
          <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
          {/* `min-w-0`: a flex item defaults to min-width:auto and would otherwise
              refuse to shrink below the table's own width, widening the page. */}
          <main className="min-h-screen min-w-0 flex-1 pb-12 md:ml-[260px]">
            <TopBar isMenuOpen={isMenuOpen} onOpenMenu={() => setIsMenuOpen(true)} />
            <div className="mx-auto max-w-[1440px] px-margin-mobile pt-28 md:px-margin-desktop">
              <Outlet />
            </div>
          </main>
        </div>
      </SearchProvider>
    </ThemeProvider>
  );
}
