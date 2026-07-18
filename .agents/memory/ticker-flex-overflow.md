---
name: ToolsTicker flex overflow pattern
description: Why the scrolling tools strip caused 11,000px document width, and how to prevent it recurring.
---

## Rule
Any `flex-1` child that contains an `inline-flex` or wide nowrap child MUST also have `min-width: 0` (`min-w-0` in Tailwind). Without it, flexbox's default `min-width: auto` lets the item expand to its content's intrinsic size, causing the document layout width to match the content — even when `overflow: hidden` is present. `overflow: hidden` only clips visually; it doesn't fix the already-computed layout width.

## Why
ToolsTicker.tsx: `ticker-viewport` was `flex-1 overflow-hidden` without `min-w-0`. The `inline-flex` ticker-track had 32 Arabic-labelled items × ~350px = ~11,200px. That set `document.body.scrollWidth` to ~11,000px. Adding `min-w-0` (plus `overflow-hidden` to the inner flex wrapper) brought it back to viewport width.

Belt-and-suspenders: `contain: layout style` added to `.tools-ticker` in `index.css` — prevents children from contributing to the document's scroll width even if the Tailwind fix is removed.

## How to apply
Whenever a flex container holds a wide non-wrapping child:
1. Add `min-w-0` to the flex item (the direct child of the flex container).
2. Also add `overflow-hidden` to the same element to clip any visual excess.
3. For ticker/marquee elements specifically, also add `contain: layout style` in CSS for safety.
