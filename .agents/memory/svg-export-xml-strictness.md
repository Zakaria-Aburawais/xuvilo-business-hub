---
name: SVG export XML strictness
description: Generated SVG strings loaded via blob URL into <img> are parsed as strict XML — raw "&" breaks exports even when inline preview works.
---
Rule: any SVG string that gets loaded as a standalone document (blob URL → `<img>` → canvas export) must be well-formed XML. Escape `&` as `&amp;` (e.g. in `@import` Google Fonts URLs inside `<style>`).

**Why:** Stamp Maker PNG/PDF export silently failed with a Vite "(unknown runtime error)" overlay — the inline preview worked because `dangerouslySetInnerHTML` uses the lenient HTML parser, but the export path uses the strict XML parser, which fatals on a raw ampersand.

**How to apply:** When generating SVG markup strings for export in any tool (stamp maker, business card, etc.), escape XML special chars in ALL embedded URLs/text, and make image `onerror` handlers reject with a real `Error` (rejecting with the raw event yields a stackless "(unknown runtime error)").
