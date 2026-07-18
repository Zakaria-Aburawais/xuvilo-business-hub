---
name: Navbar desktop overflow constraint
description: Why the desktop navbar links get hidden behind the right-hand controls, and how to avoid it
---
The desktop navbar inner row is wrapped in `max-w-7xl mx-auto` (1280px cap), so
extra viewport width beyond ~1312px adds NO usable room — the content area stays
1280px wide and centered.

**Rule:** The desktop nav links container is `flex-1 min-w-0` with `overflow`
visible and `whitespace-nowrap` items, so when total content exceeds the 1280px
cap, the trailing links (Pricing/Contact) spill OUT of their box and render
*underneath* the right-hand action controls (search/theme/lang/auth) instead of
wrapping or clipping. The user sees a link partially "hidden behind the search bar".

**Why it bites:** raising a Tailwind breakpoint (e.g. `2xl:` → `min-[1700px]:`)
does NOT fix it, because the cap is the container width, not the viewport. Adding
verbose extras (a "Search… ⌘K" label, a "Guest" badge) right at the cap is what
tips it over.

**How to apply:** the full set of nav groups + AI Writer + Pricing + Contact +
icon-search + theme + lang + Login + Sign Up just barely fits in 1280px. Do NOT
add width-y desktop extras to that row (verbose search label/kbd hint, guest
badge, more top-level links) unless you also remove something or widen the
container. Keep the search trigger icon-only on desktop.
