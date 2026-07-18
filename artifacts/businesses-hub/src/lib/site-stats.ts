// ─── Site Stats — Single Source of Truth ────────────────────────────────────
//
// All product claims shown to users should be derived from these constants,
// not from inline strings scattered across components.
//
// REAL  → derived from actual data in the codebase. Keep in sync with the
//         source arrays when those arrays change.
// MOCK  → marketing / aspirational estimates. Not tracked live. Marked
//         explicitly so future editors know to update them with real data
//         when analytics becomes available, rather than assuming they are live.
// ─────────────────────────────────────────────────────────────────────────────

// REAL — mirrors ALL_CURRENCIES in src/lib/currencies.ts
export const CURRENCY_COUNT = 176;

// REAL — mirrors ALL_TEMPLATES in src/pages/TemplatePicker.tsx
export const TEMPLATE_COUNT = 320;

// REAL — mirrors CALCULATORS array in src/pages/CalculatorsHub.tsx
export const CALCULATOR_COUNT = 14;

// REAL — number of country invoice guide pages that exist under /countries
// (57 country pages; using 50 as the rounded marketing floor)
export const COUNTRIES_SERVED_COUNT = 50;


// ─── Display strings ─────────────────────────────────────────────────────────
// Use these in JSX to avoid accidental inconsistency.

export const CURRENCY_COUNT_DISPLAY = `${CURRENCY_COUNT}+`;    // "176+"
export const TEMPLATE_COUNT_DISPLAY = `${TEMPLATE_COUNT}+`;    // "320+"
export const CALCULATOR_COUNT_DISPLAY = `${CALCULATOR_COUNT}`; // "14"
export const COUNTRIES_SERVED_DISPLAY = `${COUNTRIES_SERVED_COUNT}+`; // "50+"
