import { environment } from '../app/environments/environment';

/**
 * How a product is ordered. Stored as JSON in products.order_config.
 * A product without one uses the original business-card / rack-card form.
 *
 * {
 *   "mode": "order" | "download" | "both",   // default "order"
 *   "fields": [ { "key": "contactName", "label": "Contact Name", "required": true } ],
 *   "quantities": [250, 500, 1000],          // omitted = free number box (min 1)
 *   "unitPrice": 49.99,                      // omitted = tier price (if quantities) or "TBD"
 *   "downloads": [ { "label": "PDF", "url": "/files/scott/logo.pdf" } ],
 *   "overlay": "business-card" | "info-band",// text drawn on the preview
 *   "note": "Shown above the form",
 *   "frontLabel": "Overview",                // button label for image_url when there is a gallery
 *   "gallery": [ { "label": "Inside", "url": "/images/x-inside.jpg" } ], // extra preview pictures
 *   "backField": "backOption",               // field whose answer picks the back picture
 *   "backImages": { "DEF": "/images/x-back-def.jpg" }, // answer -> back picture
 *   "frontField": "location",                // field whose answer picks the front picture
 *   "frontImages": { "Belzoni": "/images/x-belzoni.jpg" } // answer -> front picture
 * }
 */
export type OrderFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date' | 'time';

export interface OrderField {
  key: string;
  label: string;
  type?: OrderFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DownloadLink {
  label: string;
  url: string;
}

/**
 * Text written over a picture's sample text (overlay "slots"), e.g. the date line on a flyer.
 * Coordinates are pixels on a picture `slotWidth` wide (scaled to the real picture).
 * Only drawn when one of the {fields} in `text` is filled; the box is wiped first.
 */
export interface TextSlot {
  text: string;                       // "{date} | {time}": field keys in braces
  box: [number, number, number, number]; // x, y, width, height of the sample text to wipe
  x: number;                          // text anchor (centre or left edge, see align)
  y: number;                          // baseline of the first line
  size: number;                       // font size in px
  bold?: boolean;
  color?: string;
  sepColor?: string;                  // colour for " | " separators
  align?: 'center' | 'left' | 'right';
  uppercase?: boolean;
  fontFamily?: string;                // default Arial (Oswald and Poppins are loaded in index.html)
  letterSpacing?: number;             // extra px between letters
  prefix?: string;                    // put before every line, e.g. "✓ "
  lineHeight?: number;                // multi-line text (one line per line typed)
  maxLines?: number;
}

export interface OrderConfig {
  mode?: 'order' | 'download' | 'both';
  fields?: OrderField[];
  quantities?: number[];
  unitPrice?: number;
  downloads?: DownloadLink[];
  overlay?: 'business-card' | 'info-band' | 'slots';
  /** For overlay "slots": where the entered text goes on the picture. */
  slots?: TextSlot[];
  /** Width of the picture the slot coordinates were measured on (default 1000). */
  slotWidth?: number;
  /** Draw the preview at least this wide so text on a small picture stays sharp. */
  minPreviewWidth?: number;
  note?: string;
  /** Extra preview pictures shown as buttons under the preview, e.g. a brochure's inside spread. */
  gallery?: DownloadLink[];
  /** Button label for the main picture when there is a gallery (default "Front"). */
  frontLabel?: string;
  /** Button label for image_url_back (default "Back"), e.g. "Inside Front" on a door hanger. */
  backLabel?: string;
  /** Field whose selected value picks the back picture (default "backOption"). */
  backField?: string;
  /** Back picture per value of backField; falls back to image_url_back. */
  backImages?: Record<string, string>;
  /** Field whose selected value picks the front picture (default "location"). */
  frontField?: string;
  /** Front picture per value of frontField (e.g. door hanger per location); falls back to image_url. */
  frontImages?: Record<string, string>;
}

/** Parses product.orderConfig; returns null when missing or not valid JSON. */
export function parseOrderConfig(json: string | null | undefined): OrderConfig | null {
  if (!json) return null;
  try {
    const cfg = JSON.parse(json);
    return cfg && typeof cfg === 'object' ? cfg as OrderConfig : null;
  } catch {
    return null;
  }
}

/** True when the product can only be downloaded, not ordered. */
export function isDownloadOnly(cfg: OrderConfig | null): boolean {
  return cfg?.mode === 'download';
}

/** "/files/..." links are served by the backend, so prefix the API host. */
export function resolveFileUrl(url: string): string {
  return url.startsWith('/') ? `${environment.apiUrl}${url}` : url;
}
