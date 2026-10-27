---
status: complete
date: 2026-10-27
slug: dark-theme-menu-order-brewing-animation
author: joesbrew-nw26 <joesbrew.nw26@gmail.com>
---

# Quick Task Summary: Dark Theme Lock, Menu Order Priority & Cafe Brewing Loader

## Overview
Successfully addressed the 3 customer requested updates:
1. **Removed Light Theme**: Permanently locked Joe's Brew to the dark speakeasy aesthetic (`data-theme="dark"`). Removed the `#themeToggleBtn` navbar button and cleared 840+ lines of redundant light theme overrides from CSS.
2. **Prioritized Menu Ordering**: When customers tap "Order Now" or view the full menu, items and categories now strictly display in the cafe's exact priority order:
   - 1. Artisan Teas (`TEA`)
   - 2. Fresh Coffee (`COFFEE`)
   - 3. Biscuits & Cookies (`COOKIES`)
   - 4. Cold Beverages (`DRINKS`)
   - Followed by Melt & Toast (`MELT`), Quick Bites (`SNACKS`), and Hearty Eats (`EATS`).
3. **Cafe-Themed Order Placement Loading Animation**: Added `#orderBrewingOverlay`, a custom vintage cafe loader featuring an animated steaming coffee cup & saucer SVG, rising steam wisps, ripple animation, gold glow, and warm copy ("Brewing Your Ticket... Handcrafting your table ticket & transmitting live to our ground-floor kitchen."). It displays during ticket submission and smoothly transitions into the confirmed order ticket screen.

## Artifacts Modified
- `public/index.html`: Removed light theme script & `#themeToggleBtn`, reordered category bar buttons, added `#orderBrewingOverlay` modal.
- `public/css/style.css`: Purged `html[data-theme="light"]` styles (~840 lines) and implemented `.brewing-overlay`, `.brewing-card`, `@keyframes steamFloat`, `@keyframes ripplePulse`, `@keyframes brewingProgressSlide`.
- `public/js/app.js`: Removed theme toggle logic and locked to `dark`, added category priority sorting in `renderMenuList()`, updated `submitOrder()` to display the cafe brewing loader before transitioning to `#orderSuccessModal`.
- `data/menu.json`: Reordered dataset items by category priority.
- `public/kds.html`: Reordered category tabs and item creation dropdown.

## Verification
- Verified with automated Playwright browser test in `scratch/test_all_three_fixes.cjs`:
  - `data-theme="dark"` confirmed, `#themeToggleBtn` confirmed absent.
  - Category bar tabs order confirmed: ALL, TEA, COFFEE, COOKIES, DRINKS, MELT, SNACKS, EATS.
  - Menu cards order confirmed: 100% sorted by priority across all 24 items.
  - Order submission flow verified: Brewing animation appears immediately, followed by clean transition to Order Sent modal.
