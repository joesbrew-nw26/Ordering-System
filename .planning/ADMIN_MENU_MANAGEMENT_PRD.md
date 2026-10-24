# 📋 PRD: KDS Admin Menu & Rate Management System

**Project:** Joe's Brew In-House Ordering & Brand Website  
**Component:** Kitchen Display System (KDS) & Admin Control  
**Status:** Proposal / Pending User Approval  
**Date:** October 2026  

---

## 1. Executive Summary & Objective

Currently, the Kitchen Display System (KDS) offers two authentication methods:
1. **Station PIN (`2006`)**: Quick 4-digit PIN for line cooks and dispatchers.
2. **Manager Login (`admin` / `brew2006`)**: Username and password login for managers.

While kitchen staff can toggle stock availability ("In Stock" / "Sold Out" via 1-Tap Stock Management), there is currently no way for a café manager or administrator to:
- **Change prices (rates)** of existing items on the fly (e.g., promotional pricing or cost adjustments).
- **Add new handcrafted creations** to the menu.
- **Remove obsolete or seasonal items** from the catalog.

### Goal
Provide a streamlined, secure **Admin Menu & Rate Management System** embedded within the KDS when logged in with **Admin privileges**. Any price or item changes will immediately persist to the database (Supabase PostgreSQL / local fallback) and broadcast in real time via WebSockets to all customer phones with zero page refresh.

---

## 2. User Roles & Privilege Matrix

| Action / Capability | Kitchen Staff (PIN: `2006`) | Admin / Manager (`admin` / `brew2006`) |
| :--- | :---: | :---: |
| View Active Order Tickets | ✅ Yes | ✅ Yes |
| Advance Ticket Status (Preparing / Ready / Served) | ✅ Yes | ✅ Yes |
| Resolve Waiter Calls | ✅ Yes | ✅ Yes |
| Toggle Stock ("In Stock" / "Sold Out") | ✅ Yes | ✅ Yes |
| View Shift Closing & Sales Settlement | ✅ Yes | ✅ Yes |
| **Edit Item Rates (Prices in ₹)** | ❌ Restricted | ✅ **Full Access** |
| **Add New Menu Item** | ❌ Restricted | ✅ **Full Access** |
| **Remove / Delete Menu Item** | ❌ Restricted | ✅ **Full Access** |
| **Edit Item Details (Name, Description, Badge)** | ❌ Restricted | ✅ **Full Access** |

---

## 3. Core Functional Requirements

### 3.1. Role Detection & Admin Mode Header
- When logging in via **Manager Login** (`admin` / `brew2006`), the session token is assigned `role: "Admin"`.
- A prominent gold badge **`👑 Admin Mode`** and an **`⚙️ Manage Menu & Rates`** button appear in the top bar of the KDS.
- In the right-hand **1-Tap Stock Management** sidebar, each item card displays an **`✏️ Edit Rate`** pencil button next to the price (only visible in Admin Mode).

### 3.2. Edit Item Rate (Quick Inline & Full Modal)
- **Inline Quick Edit:** Admin can click the `✏️` icon or click the price `₹25` directly in the stock sidebar to open an inline numeric input:
  - Input field pre-filled with the current price.
  - Quick action buttons: `✓ Save` and `✕ Cancel`.
  - Minimum price validation: `₹1` to `₹9,999`.
- **Full Item Edit Modal:** Allows updating:
  - Item Name
  - Price (₹)
  - Category (Artisan Teas, Fresh Coffee, Melt & Toast, Cookies, Cold Beverages, Quick Bites, Hearty Eats)
  - Beverage / Food Type (`hot`, `cold`, `snack`)
  - Description (flavor notes and ingredients)
  - Special Badge toggle (`Joe's Brew Special`)

### 3.3. Add New Menu Item
An **`+ Add New Creation`** button opens a clean modal with the following fields:
1. **Name (Required):** e.g., *"Caramel Macchiato"*, *"Masala Bun"*.
2. **Category (Required):** Dropdown selector:
   - `TEA` (Artisan Teas)
   - `COFFEE` (Fresh Coffee)
   - `MELT` (Melt & Toast)
   - `COOKIES` (Cookies)
   - `DRINKS` (Cold Beverages)
   - `SNACKS` (Quick Bites)
   - `EATS` (Hearty Eats)
3. **Price in ₹ (Required):** e.g., `85`.
4. **Type (Required):**
   - `hot` (Hot Beverage - eligible for ₹25 flask packaging per 5 cups)
   - `cold` (Cold Beverage - ₹10 sealed cup packaging)
   - `snack` (Food / Eats - ₹10 eco-box packaging)
5. **Description (Optional):** Short description for customer menu cards.
6. **Joe's Brew Special Toggle:** Optional gold ribbon badge on menu.
- **Auto-generated ID:** System generates a unique slug (e.g., `coffee-03` or `eat-04`).

### 3.4. Remove / Delete Menu Item
- Inside the Admin Menu Manager, each item has a **`🗑️ Delete Item`** action button.
- **Safeguard Confirmation:** Clicking Delete displays an alert modal:
  > *"Are you sure you want to permanently remove '[Item Name]' from the Joe's Brew menu? This will remove it from all customer tables immediately."*
- Prevents accidental deletion during busy kitchen rush hours.

### 3.5. Real-Time Synchronization Across All Devices
- When an item is updated, added, or deleted:
  1. The server updates the database (`menu_items` table in Supabase PostgreSQL or `data/menu.json` in local development).
  2. The server broadcasts a WebSocket event (`MENU_UPDATED`, `MENU_ITEM_ADDED`, or `MENU_ITEM_REMOVED`).
  3. **Customer Mobile Screens:** Instantly re-render the menu cards with updated prices or new items without reloading the page. If an item in a customer's cart was modified, the cart recalculates totals automatically.
  4. **KDS Screen:** Instantly updates the stock sidebar and category counts.

---

## 4. API Endpoints Specification

| Method | Endpoint | Auth Required | Request Body | Description |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/kds/login` | None | `{ username, password }` or `{ pin }` | Returns `{ token, user: { role: 'Admin' \| 'Staff' } }` |
| `PUT` | `/api/menu/:id` | Admin Token | `{ price, name?, description?, isSpecial? }` | Updates item price and details |
| `POST` | `/api/menu` | Admin Token | `{ name, category, price, type, description, isSpecial }` | Creates a new menu item |
| `DELETE` | `/api/menu/:id` | Admin Token | None | Permanently removes item from catalog |

---

## 5. UI / UX Design & Aesthetics

- **Vintage Speakeasy Dark Palette:** Deep mahogany (`#170E08`), antique parchment accents (`#F7EEDD`), brushed brass borders (`#C89D56`), and emerald green (`#34D399`) for success actions.
- **Touch & Desktop Friendly:** Minimum 44px tap targets for tablet/mobile KDS displays.
- **Feedback:** Clear toast notifications (e.g., `✓ Rate updated for Filter Coffee: ₹30 ➔ ₹35`).

---

## 6. Implementation Scope

1. **Backend (`server.js` & `lib/supabase.js`):**
   - Update `server.js` login route to assign `role: 'Admin'` for manager credentials.
   - Implement `PUT /api/menu/:id`, `POST /api/menu`, and `DELETE /api/menu/:id` with admin authorization checks.
   - Add helper functions in `lib/supabase.js` for `updateMenuItem`, `addMenuItem`, and `deleteMenuItem` (supporting both Supabase PostgreSQL and local JSON).
   - Add WebSocket broadcasting for menu catalog events.

2. **Frontend KDS (`public/kds.html` & `public/js/kds.js`):**
   - Store role in `localStorage` upon login.
   - Render Admin mode badge and "⚙️ Manage Menu & Rates" trigger.
   - Add inline price editing (`✏️`) directly on the 1-Tap Stock Management sidebar.
   - Add the Admin Menu Modal (Full edit, Add item form, Delete confirmation).

3. **Customer App (`public/js/app.js`):**
   - Handle incoming `MENU_UPDATED` WebSocket events to update prices and items dynamically on mobile phones without requiring a page refresh.
