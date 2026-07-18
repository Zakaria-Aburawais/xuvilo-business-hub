export type NumeralStyle = 'western' | 'eastern' | 'perso';

const EASTERN = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const PERSO   = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

export function convertNumerals(value: string | number, style: NumeralStyle): string {
  const str = String(value);
  if (style === 'western') return str;
  const map = style === 'eastern' ? EASTERN : PERSO;
  return str.replace(/[0-9]/g, d => map[parseInt(d)]);
}

export function formatCurrency(amount: number, _currency: string, style: NumeralStyle): string {
  const formatted = amount.toFixed(2);
  return convertNumerals(formatted, style);
}

export const ARABIC_CURRENCY_CODES = ['SAR','AED','EGP','LYD','JOD','KWD','QAR','BHD','OMR','IQD'];
export const PERSO_CURRENCY_CODES = ['IQD','IRR'];

export function suggestNumeralStyle(currency: string): NumeralStyle | null {
  if (PERSO_CURRENCY_CODES.includes(currency)) return 'perso';
  if (ARABIC_CURRENCY_CODES.includes(currency)) return 'eastern';
  return null;
}
