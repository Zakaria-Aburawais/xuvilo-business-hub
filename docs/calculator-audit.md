# Calculator & Tools Audit — July 2026

Scope: the 14 business calculators and 4 utility tools in `artifacts/businesses-hub`.

## Summary

- All 14 calculator formulas are now backed by pure functions in `src/lib/calculations.ts` (or verified worked examples) and covered by 31 unit tests in `src/lib/calculations.test.ts` — all passing.
- Every calculator page now shows a "How to Use" section (new `howToUse` prop on `CalculatorLayout`, bilingual heading via `calc.how_to_use` i18n key) plus the existing formula and worked-example sections.
- The 4 tool pages (Stamp Maker, Business Card, Company Profile, Temp Email) were bug-swept; real issues found were fixed (see below).

Run tests: `cd artifacts/businesses-hub && npx vitest run src/lib/calculations.test.ts`

## Calculators (14)

| Calculator | Formula source | Verified example | How to Use |
|---|---|---|---|
| Profit Margin | `calcProfitMargin` | Cost 80 / Revenue 100 → 20% margin, 25% markup | ✅ |
| Discount | `calcDiscount` | $200 @ 15% → $170 | ✅ |
| VAT | `calcVAT` (add + extract, input validation) | 1000 + 15% → 1150; extract inverse | ✅ |
| Shipping CBM | `calcCBM` | 100×60×50 cm → 0.3 m³ → 50.1 kg volumetric | ✅ |
| Overtime | `calcOvertime` | $20/hr, 8 reg + 3 OT @1.5x → $250 | ✅ |
| Leave Balance | `calcLeaveBalance` | 30 days, 9 months, 10 taken → 12.5 left | ✅ |
| Break-Even | `calcBreakEven` (refactored page) | FC 10k, VC 30, P 50 → 500 units | ✅ |
| Loan | `calcLoan` (refactored; 0%-rate branch tested) | 50k @ 6% / 5y → $966.64/mo | ✅ |
| Markup ↔ Margin | `markupToMargin` / `marginToMarkup` (refactored; round-trip tested) | 50% markup = 33.33% margin | ✅ |
| Import Cost | `calcImportCost` (refactored) | CIF 5,900 @ 5% duty → 6,395 total | ✅ |
| Invoice Aging | `calcInvoiceAging` (refactored; bucket boundaries tested) | $5,000, 45 days @0.1%/day → $5,225 | ✅ |
| Salary Cost | `calcSalaryCost` (refactored) | 3,000 basic + 12% + allowances → 4,060/mo | ✅ |
| Freight CBW | `calcFreightCBW` + `FREIGHT_FACTORS` (refactored) | Air 0.24 m³ → 40.08 kg chargeable | ✅ |
| Currency | `convertViaEur` (refactored; cross-rate consistency tested) | EUR-base cross rate, swap-consistent | ✅ (bilingual) |

Document line-item math (`calcLineItemTotal`, `calcDocumentTotals`) is also covered by tests.

## Tools (4) — bugs found & fixed

### Stamp Maker
- **Fixed**: object-URL leak in `svgToCanvas` — URL now revoked on image error as well as success.
- Noted, not changed (cosmetic/low risk): fixed `feTurbulence seed` (deterministic texture is intentional for reproducible output).
- Main actions verified: canvas preview renders; PNG/SVG download paths intact.

### Business Card
- **Fixed**: Arabic text on the canvas now renders with `ctx.direction = "rtl"` (auto-detected per string) so RTL names/companies lay out correctly.
- Noted, not changed: "Download both sides" uses a 300 ms delay between the two downloads — works in practice; a rewrite to zip both files was deemed out of scope.

### Company Profile
- **Fixed**: PDF filename is now sanitized (removes `\/:*?"<>|`, falls back to `company`) so Arabic/special-char company names can't produce invalid filenames.
- PDF export already had proper error handling + toast.

### Temp Email
- **Fixed**: relative timestamps ("just now", "5 min ago") now localized to Arabic.
- **Fixed**: race condition when rapidly clicking emails — stale fetch responses no longer overwrite the newer open email (request-id guard).
- **Fixed**: clipboard copy failures are no longer silently swallowed — a bilingual error message is shown instead of a false "Copied" state.
- Verified: all `/api-proxy/api/tempmail/*` endpoints used by the page exist in `server.ts`; timer reset on new session verified (`setTimeLeft(TOTAL_SECONDS)` on generate and restore).

## Verification

- `npx vitest run src/lib/calculations.test.ts` → 31/31 passing.
- `pnpm run typecheck:libs && pnpm --filter @workspace/businesses-hub run typecheck` → clean.
