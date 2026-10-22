/**
 * Vicky's hand-drawn icons that a category can wear, by file name (without
 * .png). The name is what is stored in the category's emoji field, so no
 * schema change was needed; an older emoji there still shows as text.
 */
export interface IconEntry {
  name: string;
  en: string;
  es: string;
  /** Extra words either language might search with. */
  keywords: string;
}

export const iconCatalog: IconEntry[] = [
  { name: "venue", en: "Venue", es: "Lugar", keywords: "hacienda salon salón fiesta party reception recepción" },
  { name: "church", en: "Church", es: "Iglesia", keywords: "ceremony ceremonia misa mass" },
  { name: "civil", en: "Civil ceremony", es: "Registro civil", keywords: "registry papers papeles boda civil" },
  { name: "dress", en: "Dress", es: "Vestido", keywords: "bride novia gown traje" },
  { name: "suit", en: "Suit", es: "Traje", keywords: "groom novio tuxedo esmoquin" },
  { name: "bride", en: "Bride", es: "Novia", keywords: "wife esposa" },
  { name: "bridal-party", en: "Bridal party", es: "Cortejo", keywords: "bridesmaids damas padrinos groomsmen" },
  { name: "engagement", en: "Engagement", es: "Compromiso", keywords: "ring anillo anillos rings" },
  { name: "cake", en: "Cake", es: "Pastel", keywords: "torta dessert postre tarta" },
  { name: "catering", en: "Catering", es: "Banquete", keywords: "food comida menu menú" },
  { name: "restaurant", en: "Restaurant", es: "Restaurante", keywords: "dinner cena food comida" },
  { name: "flowers", en: "Flowers", es: "Flores", keywords: "florist floristería bouquet ramo" },
  { name: "decor", en: "Decor", es: "Decoración", keywords: "decoration decorador decorator" },
  { name: "music", en: "Music", es: "Música", keywords: "dj band banda orquesta" },
  { name: "photos", en: "Photos", es: "Fotos", keywords: "photographer fotógrafo fotografía video" },
  { name: "makeup", en: "Makeup", es: "Maquillaje", keywords: "hair peinado beauty belleza" },
  { name: "children", en: "Children", es: "Niños", keywords: "kids niñas" },
  { name: "hotel", en: "Hotel", es: "Hotel", keywords: "stay alojamiento rooms habitaciones" },
  { name: "travel", en: "Travel", es: "Viaje", keywords: "flight vuelo trip" },
  { name: "honey-moon", en: "Honeymoon", es: "Luna de miel", keywords: "trip viaje" },
  { name: "generic", en: "Other", es: "Otro", keywords: "general misc" },
];

const iconNames = new Set(iconCatalog.map((entry) => entry.name));

/** Whether a category's stored value is one of the icons, rather than an older emoji. */
export const isIconName = (value: string | null | undefined): value is string =>
  value != null && iconNames.has(value);
