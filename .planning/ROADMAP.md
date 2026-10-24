# Roadmap: Joe's Brew In-House Ordering & Brand Website

## Overview

Build and deliver the complete digital ordering and kitchen management system for Joe's Brew, starting with the warm bento-box design system and seeded catalog, through the mobile customer ordering and UPI checkout flows, to the real-time Kitchen Display System (KDS) and printable table QR generator.

## Phases

- [ ] **Phase 1: Foundation, Warm Bento Design System & Menu Catalog** - Set up full-stack architecture, Vanilla CSS design tokens, Joe's Brew logo assets, and seeded menu catalog.
- [ ] **Phase 2: Mobile Customer Ordering App & Brand Showcase** - Implement table resolution, bento menu grid, custom cooking notes, slide-up cart drawer, and heritage landing page.
- [ ] **Phase 3: Table Checkout, UPI Integration & "Call Waiter" Service** - Build dual checkout (UPI + Pay at Counter), live order status tracker, and one-tap waiter call pager.
- [ ] **Phase 4: Real-Time Kitchen Display System (KDS) & Staff Dispatch** - Create kitchen tablet dashboard with WebSocket push, audio chimes, floor badges, and order progression controls.
- [ ] **Phase 5: Live Stock CMS, Table QR Generator & Final Integration** - Add 1-tap stock availability toggles, printable table tent card QR code suite, and end-to-end multi-device testing.

## Phase Details

### Phase 1: Foundation, Warm Bento Design System & Menu Catalog
**Goal**: Establish the full-stack server with WebSocket capabilities, core design system adhering to Joe's Brew warm palette, brand logo assets, and seeded menu database.
**Depends on**: Nothing (first phase)
**Requirements**: NAV-01, MENU-01, MENU-02, MENU-03
**Success Criteria**:
  1. Full-stack server runs with static file serving and live WebSocket broadcast ready.
  2. Warm palette design system (`#FFE4C4`, `#F5DEB3`, `#8B4513`, `#3B2E2E`) with modern typography and bento cards is live.
  3. Joe's Brew official brand logo is integrated and rendered crisply.
  4. Initial menu catalog is populated with all 20+ items across TEA, COFFEE, MELT, COOKIES, DRINKS, SNACKS, and EATS with accurate ₹ pricing and "Joe's Brew Special (*)" badges.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Initialize full-stack Node.js & WebSocket server, asset pipeline, and seeded catalog data store.
- [ ] 01-02: Create Vanilla CSS design tokens, warm bento card system, typography, and base layout shell with brand logo.

### Phase 2: Mobile Customer Ordering App & Brand Showcase
**Goal**: Build the thumb-friendly customer experience including table QR resolution, category browsing, custom item cooking notes, expandable cart sheet, and brand showcase.
**Depends on**: Phase 1
**Requirements**: NAV-02, NAV-03, CART-01, CART-02, CART-03
**Success Criteria**:
  1. App automatically resolves table number and floor from URL query parameters (e.g. `?table=Top-04`) or displays manual selector modal.
  2. Customers can filter categories, view specials, customize item instructions (e.g. "Extra sugar", "Make it extra hot"), and add to cart.
  3. Slide-up cart drawer provides seamless mobile quantity adjustments and item summaries.
  4. Brand Showcase view presents Estd 2006 heritage, cafe photos, hours, and location for external visitors.
  5. Sticky mobile bottom navigation (Menu, My Order, Call Waiter) enables one-handed navigation.
**Plans**: 2 plans

Plans:
- [ ] 02-01: Build URL table/floor resolver, manual selector modal, and brand showcase landing page.
- [ ] 02-02: Implement bento menu categories, special badges, item customization modal, slide-up cart, and sticky bottom navigation.

### Phase 3: Table Checkout, UPI Integration & "Call Waiter" Service
**Goal**: Deliver frictionless table checkout supporting Indian UPI apps and pay-at-counter options, live order progress tracking, and instant waiter paging.
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, TRACK-01, TRACK-02, SRV-01, SRV-02
**Success Criteria**:
  1. Customer can place orders choosing either instant UPI payment (with simulated/real UPI app deep links & QR) or "Pay at Counter / Waiter".
  2. "My Order" screen visually tracks status in real time (`Received` -> `Preparing` -> `Ready to Serve` -> `Delivered`).
  3. "Call Waiter" feature allows upstairs guests to summon staff for water, bill, or help with one tap.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Implement checkout flow with UPI options (GPay, PhonePe, Paytm, QR) and Pay at Counter/Waiter options.
- [ ] 03-02: Build live "My Order" progress tracker and 1-tap "Call Waiter" modal with real-time dispatch.

### Phase 4: Real-Time Kitchen Display System (KDS) & Staff Dispatch
**Goal**: Build the dedicated ground-floor kitchen tablet display with instant order updates, audio chimes, floor badges, and order lifecycle management.
**Depends on**: Phase 3
**Requirements**: KDS-01, KDS-02, KDS-03, KDS-04, KDS-05
**Success Criteria**:
  1. Ground-floor kitchen screen receives new upstairs/ground orders instantly over WebSocket without page refresh.
  2. Order tickets display prominent floor indicators (`UPSTAIRS - TABLE X` highlighted in bold contrast).
  3. Web Audio chime and visual flash alert staff of new incoming orders and waiter calls.
  4. Kitchen staff can advance ticket status with a single tap (`Received` ➔ `Preparing` ➔ `Ready to Serve` ➔ `Completed`).
  5. Marking upstairs orders `Ready to Serve` triggers an immediate runner alert for waitstaff.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Build KDS layout, ticket queue, high-contrast floor badges, and audio chime notification system.
- [ ] 04-02: Implement ticket status progression, waiter call queue, and upstairs runner alerts.

### Phase 5: Live Stock CMS, Table QR Generator & Final Integration
**Goal**: Implement instant kitchen stock toggles (out-of-stock items grey out immediately on customer screens), printable table QR suite, and end-to-end multi-device verification.
**Depends on**: Phase 4
**Requirements**: MENU-04, CMS-01, CMS-02, QR-01, QR-02
**Success Criteria**:
  1. Kitchen/manager can toggle any menu item `Sold Out` with zero-refresh instant greying out on all upstairs customer screens.
  2. Dynamic QR Code Generator produces printable table tent cards with Joe's Brew branding for all tables (`Ground-01` to `Ground-06` and `Top-01` to `Top-10`).
  3. Full multi-device customer-to-kitchen ordering workflow operates reliably across mobile and tablet viewports.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Build live stock CMS toggle system with real-time customer menu sync and server persistence.
- [ ] 05-02: Create printable table QR card suite and perform full end-to-end multi-device flow verification.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Menu Catalog | 0/2 | Not started | - |
| 2. Mobile Ordering & Brand | 0/2 | Not started | - |
| 3. Checkout & Waiter Service | 0/2 | Not started | - |
| 4. Kitchen Display System | 0/2 | Not started | - |
| 5. Stock CMS & QR Suite | 0/2 | Not started | - |
