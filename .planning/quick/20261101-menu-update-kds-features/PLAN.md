# Quick Task: Menu Overhaul, Stateless KDS Auth, and KDS Completed Order Editing

## Objective
1. Overhaul menu items and categories to match the updated Joe's Brew physical menu card (25 items across 9 categories: TEA, COFFEE, MELT, COOKIES, SNACKS, JOE'S BREW SPECIAL, EATS, DRINKS, SPECIAL DRINKS).
2. Fix the "unauthorized authentication token" issue in KDS by replacing fragile in-memory sessions with stateless HMAC-SHA256 signed session tokens that survive serverless cold starts.
3. Enhance KDS for kitchen staff: enable adding new items, editing item names/rates directly, and editing/re-opening orders already marked as "Done".
4. Synchronize the cloud Supabase database, verify everything locally and live, then push to GitHub.

## Tasks
- [ ] Task 1: Update `data/menu.json` and sync live Supabase `menu_items` table with 25 items, updated prices, names, and 9 categories.
- [ ] Task 2: Update customer frontend `public/index.html` & `public/js/app.js` (category tabs, priority, packaging rules).
- [ ] Task 3: Replace in-memory sessions in `server.js` with HMAC-SHA256 stateless tokens; allow staff token to manage menu items.
- [ ] Task 4: Enhance KDS in `public/kds.html` and `public/js/kds.js`:
  - Category selector tabs and dropdowns with all 9 categories
  - Expose "+ Add Item" and "Manage Menu & Rates" to Station Staff
  - Add Active Queue vs. Done Orders view tabs
  - Add "Edit Order" and "Re-open" capabilities to completed orders
  - Add item name editing in stock list / admin modal
- [ ] Task 5: Verify ordering, packaging charges, KDS ticket sync, token permanence, and order editing.
- [ ] Task 6: Commit and push changes to GitHub.

