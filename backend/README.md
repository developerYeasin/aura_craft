# AuraCraft — Backend API

Node.js + Express + MySQL REST API for the AuraCraft e-commerce store.

## Setup

```bash
npm install
cp .env.example .env   # fill in credentials
npm run db:migrate     # create database + tables
npm run db:seed        # demo categories, products, team, settings, admin users
npm run dev            # http://localhost:5050/api/v1
```

`npm run db:reset` drops and recreates everything, then reseeds.

## Default logins

| Role | Email | Password |
| --- | --- | --- |
| Immortal (super admin) | immortal@auracraft.com | immortal123 |
| Admin | admin@auracraft.com | admin123 |

## Architecture

```
src/
  config/       env + mysql pool (query / queryOne / transaction helpers)
  database/     schema.sql, migrate.js, seed.js
  middlewares/  auth (JWT), validate (zod), upload (multer), error handler
  modules/      auth, categories, products, orders, team, dashboard, settings, upload
                each module = routes -> controller -> service -> repository
  utils/        ApiError, asyncHandler, response envelopes, slug, order codes
  app.js        express app (helmet, cors, compression, static /uploads)
  server.js     bootstrap + graceful shutdown
```

Every response uses the envelope `{ success, data, meta? }`; errors return `{ success:false, message, errors? }`.

## Endpoints (base `/api/v1`)

### Public
- `GET  /health`
- `GET  /categories` · `?nav=true` for navbar only
- `GET  /categories/:idOrSlug`
- `GET  /products` — `page limit sort search category categoryId minPrice maxPrice material color featured inStock`
  - `sort`: `newest oldest price_asc price_desc name_asc rating featured`
- `GET  /products/home-feed?perCategory=6` — every category with its products (home page)
- `GET  /products/facets?category=rings` — filter facets + price range
- `GET  /products/:idOrSlug` — details, gallery and related products
- `POST /orders` — place an order (rate limited)
- `GET  /orders/track/:code`
- `GET  /team`
- `GET  /settings`

### Protected (Bearer token)
- `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`
- `GET|POST|PATCH|DELETE /auth/users` (immortal only)
- `GET /dashboard/stats`
- `GET /products/admin/all`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`
- `GET /categories/all`, `POST|PUT|DELETE /categories`
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `DELETE /orders/:id`
- `GET /team/all`, `POST|PUT|DELETE /team`
- `PUT /settings`
- `POST /uploads/image`, `POST /uploads/images`
- `GET /notifications` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications`
- `GET /notifications/stream` — Server-Sent Events feed (token passed as `?token=`, since EventSource cannot set headers)
- `GET /notifications/vapid-key` · `POST /notifications/subscribe` · `POST /notifications/unsubscribe` · `POST /notifications/test`

## Notifications

New orders and low-stock events raise a notification through `modules/notifications`:

1. **Stored** in the `notifications` table.
2. **Streamed** over SSE to every open admin panel — no polling, arrives instantly.
3. **Pushed** to the browser via Web Push (VAPID), so it lands even when the panel is closed.

`notify()` never throws: a notification failure must not fail an order that has already
committed, so errors are logged and swallowed.

Generate your own VAPID keys and put them in `.env`:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Push needs HTTPS in production (localhost is exempt). Without VAPID keys the app still works —
live in-panel alerts continue, only the closed-tab push is disabled.

## Roles
`immortal` (full control incl. user management) > `admin` > `manager` (catalog + orders, no destructive actions).
