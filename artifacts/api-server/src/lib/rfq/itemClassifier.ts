/**
 * Classifies parsed RFQ items into 4 strategy buckets and assigns a
 * category icon for fallback when no image is available.
 */
import type { ParsedRfqItem } from "./rfqParser";

export const KNOWN_BRANDS: string[] = [
  "OSRAM", "PHILIPS", "SIEMENS", "ABB", "SCHNEIDER", "RICOH", "LEGRAND",
  "EATON", "3M", "BOSCH", "SKF", "FAG", "NSK", "PARKER", "GATES", "YOKOGAWA",
  "EMERSON", "HONEYWELL", "ENDRESS", "GRUNDFOS", "FLOWSERVE", "CRANE",
  "SPIRAX", "HABONIM", "ROTORK", "BIFFI", "BETTIS", "ASCO", "IMI",
  "DANFOSS", "ALFA LAVAL", "GEA", "SPX", "SULZER", "KSB", "WILO", "EBARA",
  "GRACO", "LINCOLN", "TIMKEN", "INA", "NTN", "KOYO", "NACHI",
  "CATERPILLAR", "CAT", "CUMMINS", "PERKINS", "DETROIT", "VOLVO", "KOMATSU",
  "ATLAS COPCO", "INGERSOLL RAND", "GARDNER DENVER", "ELGI",
  "FLUKE", "MEGGER", "HIOKI", "KYORITSU", "TESTO", "FLIR",
  "PALL", "HYDAC", "STAUFF", "FESTO", "SMC", "PHOENIX CONTACT",
  "WAGO", "MURR", "PEPPERL FUCHS", "TURCK", "BALLUFF",
  "OMRON", "KEYENCE", "SICK", "BANNER", "COGNEX",
  "HENKEL", "LOCTITE", "CHESTERTON", "MOLYKOTE",
  "CASTROL", "SHELL", "MOBIL", "TOTAL", "FUCHS", "KLUBER",
  "SIKA", "FOSROC", "MAPEI", "HILTI", "FISCHER",
  "SULTAN", "LAHLOUB",
];

export type ItemType =
  | "branded_with_part"
  | "branded_no_part"
  | "part_number_only"
  | "description_only";

export type ItemConfidence = "high" | "medium" | "low";

export type ItemStrategy =
  | "manufacturer_part_lookup"
  | "brand_model_lookup"
  | "part_number_lookup"
  | "generic_search";

export interface ClassifiedItem extends ParsedRfqItem {
  type: ItemType;
  confidence: ItemConfidence;
  strategy: ItemStrategy;
  detectedBrand: string;
  categoryIcon: string;
}

function detectBrand(description: string, manufacturer: string): string {
  if (manufacturer) return manufacturer.toUpperCase();
  const upper = description.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (upper.includes(b)) return b;
  }
  return "";
}

/** Map description keywords to category emoji icons. */
export function getCategoryIcon(description: string): string {
  const d = description.toLowerCase();
  if (/lamp|light|bulb|luminaire/.test(d)) return "💡";
  if (/pump/.test(d)) return "⚙️";
  if (/valve/.test(d)) return "🔧";
  if (/cable|wire|conduit/.test(d)) return "🔌";
  if (/cement|concrete|mortar/.test(d)) return "🏗️";
  if (/paint|coating|primer/.test(d)) return "🪣";
  if (/filter|strainer/.test(d)) return "🔩";
  if (/printer|copier|scanner/.test(d)) return "🖨️";
  if (/water|drinking/.test(d)) return "💧";
  if (/strap|rope|chain|sling/.test(d)) return "⛓️";
  if (/sensor|detector|transmitter/.test(d)) return "📡";
  if (/motor|engine|generator/.test(d)) return "⚙️";
  if (/bearing/.test(d)) return "🔩";
  if (/gasket|seal|o.ring/.test(d)) return "🔧";
  if (/chemical|fluid|lubricant/.test(d)) return "🧪";
  if (/safety|ppe|helmet|glove/.test(d)) return "🦺";
  if (/computer|laptop|server/.test(d)) return "💻";
  if (/pipe|fitting|flange/.test(d)) return "🔩";
  if (/instrument|gauge|meter/.test(d)) return "📊";
  return "📦";
}

/** Classify a single parsed item into one of four research strategies. */
export function classifyItem(item: ParsedRfqItem): ClassifiedItem {
  const detectedBrand = detectBrand(item.description, item.manufacturer);
  const hasBrand = Boolean(detectedBrand);
  const hasPart = Boolean(item.partNo);

  let type: ItemType;
  let confidence: ItemConfidence;
  let strategy: ItemStrategy;

  if (hasBrand && hasPart) {
    type = "branded_with_part";
    confidence = "high";
    strategy = "manufacturer_part_lookup";
  } else if (hasBrand) {
    type = "branded_no_part";
    confidence = "medium";
    strategy = "brand_model_lookup";
  } else if (hasPart) {
    type = "part_number_only";
    confidence = "medium";
    strategy = "part_number_lookup";
  } else {
    type = "description_only";
    confidence = "low";
    strategy = "generic_search";
  }

  return {
    ...item,
    manufacturer: detectedBrand || item.manufacturer,
    type,
    confidence,
    strategy,
    detectedBrand,
    categoryIcon: getCategoryIcon(item.description),
  };
}
