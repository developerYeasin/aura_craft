# 🪷 AuraCraft — Modern E-commerce (React + Node + MySQL)

Premium jewellery, perfume and gift-item store built from the provided design concept.
Two independent apps: **`frontend/`** (React 18 + Vite) and **`backend/`** (Node.js + Express + MySQL).

```
AuraCraft/
├── backend/     Express REST API, MySQL, JWT auth, modular architecture
└── frontend/    React SPA, React Router, context state, custom design system
```

---

## Quick start

```bash
# 1. install both apps
npm run install:all

# 2. create the database schema and demo data
npm --prefix backend run db:reset

# 3. run them (two terminals)
npm run dev:api    # http://localhost:5050/api/v1
npm run dev:web    # http://localhost:5173
```

Credentials for the admin panel (`/admin`):

| Role | Email | Password |
| --- | --- | --- |
| Immortal (super admin) | `immortal@auracraft.com` | `immortal123` |
| Admin | `admin@auracraft.com` | `admin123` |

Environment files are already filled in (`backend/.env`, `frontend/.env`). The API port is **5050**
because 5000 was occupied on the dev machine; change `PORT` and `VITE_API_URL` together if needed.

---

## What is implemented

### 🏠 Home page — every product, in one place
- Hero banner with the tagline from settings, plus a trust strip (১০০% অরিজিনাল, দ্রুত ডেলিভারি …)
- Category tiles with live thumbnails → each links to its dedicated collection page
- "কেন আমাদের বেছে নেবেন?" highlights
- **Featured Products** row
- Special offer banner (title/text editable in admin settings)
- **Every category rendered in full**, each with its own intro, product count and `সব দেখুন →` link —
  no category is hidden from the home page

### 🧭 Navbar
Home · সব প্রোডাক্ট · every active category (auto-generated from the database) · ভবিষ্যতে যুক্ত হবে ·
অর্ডার ট্র্যাক · টিম/মেম্বার — plus search, wishlist, cart and a mobile drawer.

**Staff entry points are not linked from the storefront.** The admin panel is reached by typing
`/admin` directly, so the public site never advertises a login target. Access control itself is
server-side (JWT + role checks on every protected route); hiding the link only removes discoverability.
Login is rate limited to 10 attempts per 15 minutes per IP.

### 🔎 Category & catalog pages
`/category/:slug` and `/products` share one page component with:
banner, breadcrumbs, search, sort (৭ modes), price buckets, material/colour facets (counts from the DB),
in-stock filter, pagination and skeleton loading.

### 💍 Product details
Gallery with thumbnails, discount %, live stock badge, rating, variant/size picker, quantity stepper,
Order Now / Add to Cart, tabbed description–specs–delivery, and related products.

### 🛒 Cart, checkout & orders
Persistent localStorage cart · delivery-area based charge · validated checkout form ·
order confirmation page with order code · public order tracking (`/track`) with a status timeline.

### 👥 Team page
Members, roles, bios and social links — fully managed from the admin panel.

### 🛡️ Admin panel (separate login, reached at `/admin`)
Dashboard (totals, 14-day sales chart, category breakdown, recent orders, top products) ·
Products CRUD with multi-image support and file upload · Categories CRUD ·
Orders with inline status change and detail view · Team CRUD · Settings (site copy, contacts,
socials, delivery charges, password change) · **Users** (Immortal only: create/disable/delete staff).

### 🔔 Order notifications
When a customer places an order the admin is alerted on three channels:

| Channel | Status |
| --- | --- |
| **Live in-panel** (Server-Sent Events) | ✅ **Verified working** — arrives instantly in every open admin tab, no polling |
| **Browser notification** (tab backgrounded) | ⚠️ Implemented, needs a real browser to confirm |
| **Web Push / VAPID** (tab closed) | ⚠️ Implemented, **not yet confirmed end-to-end** — see below |

**On Web Push:** `pushManager.subscribe()` needs a reachable push service (FCM for Chrome). In a
headless test browser that call hangs indefinitely, so the subscribe path is wrapped in a 12-second
timeout — the UI reports a clear failure instead of spinning forever, and the live + background
channels keep working regardless. Confirm it on a real browser over HTTPS with the **টেস্ট** button
in the bell panel; a successful subscription shows up as a row in `push_subscriptions`.

The bell panel lists recent alerts, marks them read, mutes sound, and has a **টেস্ট** button so
you can confirm delivery on a device. **Low-stock** warnings fire on the same channel when an
order drops a product to 5 or fewer units. Notification text uses Bengali numerals like the rest
of the UI.

### 🚀 Future categories
Add a category in the admin panel and it appears automatically in the navbar, the home page feed and
the routing — no code change. `/upcoming` previews the planned ones (Watches, Necklace, Sunglasses …).

### 🎨 Design system
`frontend/src/styles/globals.css` is one token-driven system — no utility framework, no inline theme.

- **Ground** — animated aurora mesh + film-grain overlay on a near-black base, both fixed and
  `pointer-events: none`, so every page shares one atmosphere.
- **Surfaces** — cards carry a *hairline gradient border* drawn with a masked pseudo-element, which
  brightens on hover. No flat 1px greys anywhere.
- **Type** — three roles: `Cormorant Garamond` + `Noto Serif Bengali` for display headings (fallback
  is per-glyph, so Bengali gets a real serif), `Hind Siliguri` for body, `Outfit` for numerals and
  UI labels. Sizes come from a `clamp()` scale (`.t-hero`, `.t-h1`…`.t-h3`).
- **Icons** — a hand-built 50-icon SVG set (`components/ui/Icons.jsx`) with `categoryIcon(slug)`
  resolving a category to its glyph. No emoji are used as interface icons.
- **Motion** — staggered scroll reveals (`<Reveal delay>`), button sheen sweeps, floating hero chips,
  a marquee ticker, conic-gradient avatar rings; all disabled under `prefers-reduced-motion`.
- **Layout** — an asymmetric bento grid for categories, a layered hero (orb + orbit ring + framed
  product + floating stat chips), and a sticky buy bar that appears when the buy box scrolls away.

### 📱 Responsive
Breakpoints at 1160 / 1080 / 880 / 680px. The hero reflows to a centred single column, the bento
collapses to one card per row, filters become a toggle, the product-card hover bar becomes static on
touch devices (`@media (hover: none)`), and the admin sidebar turns into a drawer. Verified on
desktop, tablet and 390px mobile.

---

## Backend architecture

```
backend/src/
  config/       env loader, mysql2 pool (query / queryOne / transaction)
  database/     schema.sql · migrate.js (--fresh) · seed.js
  middlewares/  auth (JWT + roles), validate (zod), upload (multer), error handler
  modules/      auth · categories · products · orders · team · dashboard · settings · upload
                routes → controller → service → repository per module
  utils/        ApiError · asyncHandler · response envelopes · slug · order codes
  app.js        helmet, cors allow-list, compression, static /uploads
  server.js     DB ping on boot + graceful shutdown
```

Responses use `{ success, data, meta? }`; errors use `{ success:false, message, errors? }`.
Orders are placed inside a transaction that also decrements stock. Rate limits guard login and
order placement. Full endpoint list: [backend/README.md](backend/README.md).

**Remote-database resilience.** MySQL is on another host, and idle sockets get dropped by the
server (and by anything doing NAT in between). Left alone, the pool hands out a dead connection and
the next query stalls for ~20s before failing with `ECONNRESET` — which takes *every* data-driven
page down at once. `config/db.js` guards against this on three fronts:

| Layer | What it does |
| --- | --- |
| `enableKeepAlive` + `keepAliveInitialDelay` | holds the TCP socket open |
| `idleTimeout` / `maxIdle` | retires idle connections on our side before the server kills them |
| `withRetry()` | transparently retries once on `ECONNRESET`/`PROTOCOL_CONNECTION_LOST`/`fatal` |
| 60s heartbeat (`server.js`) | keeps the pool warm so no visitor pays for a dead socket |

Only the connection checkout is retried inside `transaction()` — once statements have run they must
not be replayed, so mid-transaction failures roll back and surface to the caller.

`GET /health` pings the database and returns **503** when it cannot reach it. A process that is up
but cannot query is not healthy, and reporting 200 there hides the exact failure that breaks the site.

**Tables:** `users · categories · products · product_images · orders · order_items · team_members · settings`

## Frontend architecture

```
frontend/src/
  api/          axios client (auth header, error normalisation) + typed endpoint groups
  components/   layout (Navbar, Footer, PublicLayout, AdminLayout)
                ui (Modal, ConfirmDialog, Pagination, Field, Reveal, Loader, Icons…)
                product (ProductCard, OrderSummaryCard)
  context/      Store (categories + settings) · Cart · Auth · Toast
  hooks/        useWishlist (shared localStorage store)
  pages/        Home, CatalogPage, ProductDetails, Cart, Checkout, OrderSuccess,
                TrackOrder, Team, Wishlist, Upcoming, NotFound, admin/*
  styles/       globals.css — one design-token driven system
  utils/        Bengali numerals, currency, dates, order-status map
```

Admin pages are code-split with `React.lazy`; the storefront shell loads eagerly.

---

## Notes

- Demo product photos are remote Unsplash URLs written by the seeder, and the seeder rotates each
  category's photo pool per product so neighbouring cards never share a primary image. Product photos
  vary in brightness, so `.pcard__media` applies a bottom vignette and the badges carry their own
  opaque base — light photos stay readable against the dark theme. Replace any image from
  **Admin → Products → Edit** (paste a URL or upload a file — uploads are served from `/uploads`).
- `npm --prefix backend run db:reset` wipes and recreates everything, including the demo orders.
- **Sessions:** a missing, expired or tampered token sends staff to `/admin/login?expired=1` with a
  Bengali notice, rather than rendering a raw `Authentication token missing` error card. Roles are
  enforced twice — `RequireRole` on the route and `authorize()` on the API — so a plain `admin`
  visiting `/admin/users` is redirected to the dashboard instead of hitting a 403.
