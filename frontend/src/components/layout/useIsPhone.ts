import { useEffect, useState } from "react";

/** Below Tailwind's `sm` breakpoint: where a row of chips would wrap into a pile. */
const phoneQuery = "(max-width: 639px)";

/** From Tailwind's `md` breakpoint: where the sidebar sits beside the page instead of in a drawer. */
const sidebarQuery = "(min-width: 768px)";

/** Whether a media query matches, following it as the window is resized or the phone turned. */
function useMediaQuery(media: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(media).matches);

  useEffect(() => {
    const query = window.matchMedia(media);
    const follow = (event: { matches: boolean }) => setMatches(event.matches);
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [media]);

  return matches;
}

/** Whether the screen is phone-width. */
export const useIsPhone = () => useMediaQuery(phoneQuery);

/** Whether the screen is wide enough for the sidebar to sit beside the page. */
export const useHasSidebar = () => useMediaQuery(sidebarQuery);
