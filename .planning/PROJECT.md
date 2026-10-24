# Joe's Brew In-House Ordering & Brand Website

## What This Is

A mobile-first digital menu and table-ordering web application paired with a brand showcase for **Joe's Brew** (Estd 2006). Customers scan QR codes at physical tables to browse the curated menu, customize items, and place orders directly to the ground-floor kitchen from both ground and upstairs seating, while kitchen staff track and advance tickets in real time via an interactive Kitchen Display System (KDS).

## Core Value

Eliminates ordering friction for upstairs customers by routing digital table orders and waiter calls directly to the ground-floor kitchen with instant real-time sync.

## Business Context

- **Customer**: Seated dine-in café customers (ground floor & upstairs) and visiting web patrons.
- **Revenue model**: In-house food and beverage orders via quick UPI mobile payments and pay-at-counter options.
- **Success metric**: 100% of upstairs tables can place orders and summon waitstaff from their smartphones without walking downstairs.
- **Strategy notes**: Drive table turnover, eliminate missed orders, and celebrate Joe's Brew's 2006 heritage.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Mobile-first Bento-box digital menu with warm palette (`#FFE4C4`, `#F5DEB3`, `#8B4513`, `#3B2E2E`)
- [ ] Table & floor resolution via QR code URL (`?table=Top-04`) and manual selection fallback
- [ ] Item customization with cooking notes and slide-up cart drawer
- [ ] Frictionless table checkout supporting quick UPI apps and Pay at Counter/Waiter
- [ ] Live "My Order" visual status tracking (`Received` -> `Preparing` -> `Ready to Serve` -> `Delivered`)
- [ ] 1-Tap "Call Waiter" pager for water, bill, and table assistance
- [ ] Real-time Kitchen Display System (KDS) with audio chimes and high-contrast floor badges (`UPSTAIRS - TABLE X`)
- [ ] Live menu stock management toggle with instant "Sold Out" badge reflection on customer screens
- [ ] Brand showcase landing page celebrating Estd 2006 heritage with official logo
- [ ] Printable table QR code generator for Ground (`Ground-01`..`06`) and Upstairs (`Top-01`..`10`)

### Out of Scope

- Native iOS/Android App Store builds - Web-first responsive web app covers 100% of table QR code visits without requiring app installation.
- Third-party home delivery logistics - Focused specifically on in-house dine-in ordering and brand discovery.
- Customer account/password creation - Guests order immediately at tables without signup barriers.

## Context

- Physical layout: Two-story café with ground-floor kitchen and upstairs dining area.
- Brand Assets: Official logo (`assets/logo.jpg`) featuring "BLISSFUL COFFEE ESTD 2006 Joe's BREW".
- Menu Catalog: Initial seeded menu spanning TEA, COFFEE, MELT, COOKIES, DRINKS, SNACKS, and EATS with ₹ pricing and "Joe's Brew Special (*)" badges.
- Primary Audience: Smartphone users seated at tables in various lighting conditions.

## Constraints

- **Mobile-First UX**: 95% of ordering traffic is on smartphones; design must be thumb-friendly and not rely on desktop hover states.
- **Styling**: Vanilla CSS with customized design tokens and bento-box styling; no Tailwind.
- **Real-Time Communication**: Zero-refresh order routing between upstairs customer phones and kitchen display via WebSockets / event streaming.
- **Payment Localization**: High priority on Indian UPI payment flows (GPay, PhonePe, Paytm, BHIM) along with cash/counter options.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Official Logo Integration | Use uploaded brand crest asset (`assets/logo.jpg`) in navigation, hero, and printable QR cards | ✓ Good |
| Warm Bento-Box Aesthetic | Follows PRD warm palette (`#FFE4C4`, `#F5DEB3`, `#8B4513`, `#3B2E2E`) with high readability under cafe lighting | ✓ Good |
| Node.js + WebSocket Architecture | Guarantees instant sub-second order transmission to kitchen display across devices without manual refresh | ✓ Good |
| Dual Checkout Modes | Support both instant UPI mobile checkout and traditional pay-at-counter to accommodate all customer types | ✓ Good |

---
*Last updated: 2026-10-09 after initial project definition*
