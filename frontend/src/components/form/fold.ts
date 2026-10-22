/** "Fotó" finds "Foto": the planner's names mix Spanish, Italian and English. */
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
