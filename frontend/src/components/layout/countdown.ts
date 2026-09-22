const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days from today to the wedding, counted in the viewer's own timezone:
 * "65 Days to Go" should turn over at their midnight, not at UTC's.
 */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weddingDay = new Date(year, month - 1, day).getTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return Math.round((weddingDay - startOfToday) / MILLISECONDS_PER_DAY);
}
