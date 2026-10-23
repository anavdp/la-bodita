import { useEffect, useState } from "react";

/** Below Tailwind's `sm` breakpoint: where a row of chips would wrap into a pile. */
const phoneQuery = "(max-width: 639px)";

/** Whether the screen is phone-width, following it as the window is resized or the phone turned. */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(phoneQuery).matches);

  useEffect(() => {
    const query = window.matchMedia(phoneQuery);
    const follow = (event: { matches: boolean }) => setIsPhone(event.matches);
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);

  return isPhone;
}
