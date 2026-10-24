# Requirements: Joe's Brew In-House Ordering & Brand Website

**Defined:** 2026-10-09  
**Core Value:** Eliminates ordering friction for upstairs customers by routing digital table orders and waiter calls directly to the ground-floor kitchen with instant real-time sync.

## v1 Requirements

### Brand & Navigation
- [ ] **NAV-01**: Header displays official Joe's Brew brand crest logo, table badge, and quick access actions.
- [ ] **NAV-02**: Mobile sticky bottom navigation bar provides thumb-friendly access to Menu, My Order, and Call Waiter.
- [ ] **NAV-03**: Brand Showcase landing page highlights Estd 2006 heritage, interior photos, operating hours, physical location, and "Order at Table" CTA.

### Menu & Bento Catalog
- [ ] **MENU-01**: Bento-box responsive menu grid displays categories: TEA, COFFEE, MELT, COOKIES, DRINKS, SNACKS, EATS.
- [ ] **MENU-02**: Items flagged as specials display the prominent "Joe's Brew Special (*)" star badge.
- [ ] **MENU-03**: Catalog is seeded with initial prices in ₹ (INR) and supports quick `+ Add` button interaction.
- [ ] **MENU-04**: Sold-out items are instantly greyed out with a "Sold Out" badge, preventing upstairs customers from ordering.

### Cart & Customization
- [ ] **CART-01**: Slide-up cart drawer displays order items, unit prices, quantity increment/decrement, and subtotal.
- [ ] **CART-02**: Customers can input custom item instructions (e.g., "Extra sugar", "Make it extra hot").
- [ ] **CART-03**: Cart automatically validates table and floor before allowing order submission.

### Table Checkout & Payment
- [ ] **PAY-01**: Captures floor and table automatically from QR URL parameter (`?table=Top-04`) with manual fallback modal.
- [ ] **PAY-02**: Fast UPI payment option with quick apps (GPay, PhonePe, Paytm, BHIM) and QR code flow.
- [ ] **PAY-03**: "Pay at Counter / Waiter" option for cash or card payment after meal.

### Live Order Tracking & Service
- [ ] **TRACK-01**: "My Order" screen shows live status tracker (`Received` ➔ `Preparing` ➔ `Ready to Serve` ➔ `Delivered`).
- [ ] **TRACK-02**: Order state syncs live over WebSocket so upstairs customers see real-time preparation progress.
- [ ] **SRV-01**: 1-Tap "Call Waiter" modal with quick reasons (Water Refill, Request Bill, General Assistance).
- [ ] **SRV-02**: Waiter summons transmit instantly with table number to staff screen with notification sound.

### Kitchen Display System (KDS)
- [ ] **KDS-01**: Staff kitchen board updates in real time via WebSockets with zero manual page refreshing.
- [ ] **KDS-02**: Tickets display prominent high-contrast floor badges (`UPSTAIRS - TABLE X` vs `GROUND - TABLE X`).
- [ ] **KDS-03**: Audio chime and animated banner trigger whenever a new ticket arrives or waiter is called.
- [ ] **KDS-04**: Staff can tap order status toggles: `Received` ➔ `Preparing` ➔ `Ready to Serve` ➔ `Completed`.
- [ ] **KDS-05**: Marking an upstairs order `Ready to Serve` triggers a visual runner alert for waitstaff.

### Live Stock CMS & QR Suite
- [ ] **CMS-01**: Manager/Kitchen dashboard provides 1-tap stock toggles (`In Stock` ⇄ `Sold Out`) that update in real time.
- [ ] **CMS-02**: Menu catalog data and stock overrides persist on server storage across sessions.
- [ ] **QR-01**: Dynamic QR Code Generator creates QR codes for Ground (`Ground-01` to `Ground-06`) and Upstairs (`Top-01` to `Top-10`).
- [ ] **QR-02**: Printable table tent card view with Joe's Brew logo and table QR ready for printing.

## v2 Requirements

### Analytics & Inventory
- **ANLT-01**: Daily revenue and sales volume reports by category.
- **INVN-01**: Raw material inventory tracking (coffee beans, milk, sugar).
- **CUST-01**: Loyalty phone number capture for repeat customer discounts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native Mobile Apps (App Store / Play Store) | Frictionless QR web app eliminates download requirement for diners |
| Third-party doorstep delivery fleet | Focus is exclusively in-house table ordering and brand showcase |
| Customer password-based accounts | Diners need instant 10-second ordering without sign-up hurdles |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 1 | Pending |
| MENU-01 | Phase 1 | Pending |
| MENU-02 | Phase 1 | Pending |
| MENU-03 | Phase 1 | Pending |
| NAV-02 | Phase 2 | Pending |
| NAV-03 | Phase 2 | Pending |
| CART-01 | Phase 2 | Pending |
| CART-02 | Phase 2 | Pending |
| CART-03 | Phase 2 | Pending |
| PAY-01 | Phase 3 | Pending |
| PAY-02 | Phase 3 | Pending |
| PAY-03 | Phase 3 | Pending |
| TRACK-01 | Phase 3 | Pending |
| TRACK-02 | Phase 3 | Pending |
| SRV-01 | Phase 3 | Pending |
| SRV-02 | Phase 3 | Pending |
| KDS-01 | Phase 4 | Pending |
| KDS-02 | Phase 4 | Pending |
| KDS-03 | Phase 4 | Pending |
| KDS-04 | Phase 4 | Pending |
| KDS-05 | Phase 4 | Pending |
| MENU-04 | Phase 5 | Pending |
| CMS-01 | Phase 5 | Pending |
| CMS-02 | Phase 5 | Pending |
| QR-01 | Phase 5 | Pending |
| QR-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-09*
*Last updated: 2026-10-09 after initial definition*
