import { iconUrl } from "./icons";

/** The Calendar page's illustration, shrunk to mark a date wherever one shows. */
export function CalendarMark({ className = "h-6 w-6" }: { className?: string }) {
  return <img src={iconUrl("title-calendar.png")} alt="" aria-hidden="true" className={`${className} object-contain`} />;
}
