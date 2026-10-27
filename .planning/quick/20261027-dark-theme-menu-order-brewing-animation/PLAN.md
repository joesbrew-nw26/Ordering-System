# Quick Task Plan: Dark Theme Lock, Priority Menu Order & Cafe Brewing Animation

## Goal
Address three customer-facing issues on Joe's Brew Ordering System:
1. **Remove Light Theme**: Permanently lock to dark speakeasy theme; purge light theme toggle button, script, and redundant light theme styles.
2. **Reorder Menu Items & Categories by Priority**:
   Ensure menu displays items in the required cafe priority:
   - 1. Artisan Teas (`TEA`)
   - 2. Fresh Coffee (`COFFEE`)
   - 3. Biscuits & Cookies (`COOKIES`)
   - 4. Cold Beverages (`DRINKS`)
   - 5. Melt & Toast (`MELT`)
   - 6. Quick Bites (`SNACKS`)
   - 7. Hearty Eats (`EATS`)
   Update `#menuCategoriesBar` tabs in `public/index.html`, reorder natural item sequence in `data/menu.json`, and sort items in `renderMenuList()` in `public/js/app.js` when "ALL" category is active.
3. **Cafe-Themed Order Placement Loading Animation**:
   Add a simple yet unique vintage cafe loading screen overlay (`#orderBrewingOverlay`) featuring an animated steaming coffee cup SVG with rising steam wisps, ripple effect, and warm speakeasy messaging ("Brewing Your Ticket... Handcrafting your table ticket & transmitting live to our ground-floor kitchen"). Show it seamlessly while the order confirms, then transition to `#orderSuccessModal`.

## Implementation Steps
1. **Remove Light Theme**:
   - `public/index.html`: Set `<html lang="en" data-theme="dark">`, remove `jb_theme` localStorage script, remove `#themeToggleBtn`.
   - `public/js/app.js`: Remove `themeToggleBtn` reference, simplify `initTheme()`, remove `applyTheme()`.
   - `public/css/style.css`: Delete `.nav-btn--theme` styles and `html[data-theme="light"]` rule block (~lines 5270–6166).
2. **Prioritized Menu Order**:
   - `public/index.html`: Reorder `#menuCategoriesBar` tabs: ALL -> TEA -> COFFEE -> COOKIES ("Biscuits & Cookies") -> DRINKS -> MELT -> SNACKS -> EATS.
   - `data/menu.json`: Rearrange item blocks: TEA, COFFEE, COOKIES, DRINKS, MELT, SNACKS, EATS.
   - `public/js/app.js`: In `renderMenuList()`, sort items using `CATEGORY_PRIORITY` map when `state.activeCategory === 'ALL'`.
   - `public/kds.html`: Reorder admin filter tabs & add item category select to match priority.
3. **Cafe Order Placement Loading Animation**:
   - `public/index.html`: Add `#orderBrewingOverlay` markup with custom coffee cup SVG and animated steam waves.
   - `public/css/style.css`: Add styles for `.brewing-overlay`, `.brewing-card`, `@keyframes steamRise`, `@keyframes coffeeRipple`, and gilded progress animation.
   - `public/js/app.js`: In `submitOrder()`, display `#orderBrewingOverlay` immediately upon clicking confirm, close `#paymentModalBackdrop`, await order completion (with a minimum visual pacing of ~700ms), then hide overlay and open `#orderSuccessModal`.
4. **Verification**:
   - Automated browser test via Playwright script verifying:
     - Theme is locked to dark; `#themeToggleBtn` absent.
     - Category bar sequence and menu item rendering sequence order (TEA, COFFEE, COOKIES, DRINKS, etc.).
     - Clicking confirm order reveals the brewing animation overlay before transitioning to success modal.
