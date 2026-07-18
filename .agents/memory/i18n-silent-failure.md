---
name: i18n silent-failure pattern
description: t() returns the raw key name when missing — never triggers || fallbacks; only caught by visual inspection or grep audit.
---

## Rule
When a translation key is absent from `en.ts` / `ar.ts`, `t(key)` returns the raw key string (e.g. `"calc.salary_cost.name"`). Because a non-empty string is truthy, patterns like `t("key") || "Default text"` never fire. The raw key silently renders in the UI.

**Why:** The i18n helper has no explicit "missing key" sentinel — it falls through to returning the key itself.

**How to apply:**
- When adding a new page or calculator, always add BOTH `.name` AND `.desc` keys (minimum) to `en.ts` and `ar.ts` in the same commit.
- Run a grep audit to catch drift: `grep -rn 't("' src/pages/ | grep -oP 't\("[^"]+"\)'` then diff against keys in `en.ts`.
- Found in QA audit July 2026: 3 missing keys across 2 calculator pages (VAT error messages, salary-cost title/desc, importcost.name alias).
- The naming convention is inconsistent — some keys use underscore (`calc.import_cost`), some use dot (`calc.import`). Follow `calc.<short-slug>.name` / `calc.<short-slug>.desc` for new entries.
