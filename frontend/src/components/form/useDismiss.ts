import { useEffect } from "react";
import type { RefObject } from "react";

/** Closes a popover on Escape or on a press anywhere outside it, while it is open. */
export function useDismiss(ref: RefObject<HTMLElement | null>, isOpen: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // The popover closes; the panel around it stays open.
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [ref, isOpen, onDismiss]);
}
