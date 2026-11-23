# WedPlan Server

Express.js + Better Auth + MongoDB backend for WedPlan. Runs separately from the Next.js client at `http://localhost:5000`.

## Features

- Better Auth email/password + Google OAuth, JWT plugin (`/api/auth/token`), session cookies
- JWT Bearer verification and role middleware (admin / vendor / customer)
- Services: public browsing, vendor CRUD, approval status, admin moderation
- Bookings: customer create/cancel, vendor accept/reject, ownership enforcement
- Subscriptions: Stripe Checkout Sessions, **webhook-verified** plan activation, billing history
- Uploads: ImgBB image hosting
- Blocked users cannot access any protected API

## Getting started

```bash
npm install
npm run dev      # node --watch src/index.js
```

### Environment variables

Create `.env` in the project root (gitignored — never commit it):

```env
PORT=5000
DB_USER=<mongodb-user>
DB_PASSWORD=<mongodb-password>
DB_NAME=<database-name>

BETTER_AUTH_SECRET=<long-random-string>
BETTER_AUTH_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-signing-secret>

IMGBB_API_KEY=<imgbb-api-key>
```

> All secrets stay server-side. The client only receives short-lived JWTs issued by Better Auth.

## Google OAuth setup

Register these redirect URIs on the **same** OAuth client in Google Cloud Console:

```
http://localhost:5000/api/auth/callback/google
https://<your-deployed-server>/api/auth/callback/google
```

Set `BETTER_AUTH_URL` to the matching server origin for each environment.

## Stripe webhook setup

Local development:

```bash
stripe listen --forward-to localhost:5000/api/payment/webhook
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET` and **restart the server** (`.env` is read at startup).

Production: add a webhook endpoint in the Stripe Dashboard pointing to:

```
https://<your-deployed-server>/api/payment/webhook
```

Subscribe to `checkout.session.completed`, `customer.subscription.deleted`, and `invoice.payment_failed`.

**Premium access is only granted by the verified webhook** — no client-side redirect or API call can activate a paid plan.

## API structure

| Prefix | Purpose |
|---|---|
| `/api/auth/*` | Better Auth (sign-in/up, session, JWT token, Google) |
| `/api/services/*` | Public listing, vendor CRUD, admin moderation |
| `/api/bookings/*` | Customer bookings, vendor accept/reject |
| `/api/subscription` | Read-only current plan |
| `/api/payment/*` | Checkout session, webhook, status, cancel, billing history |
| `/api/admin/*` | Stats, users, services moderation, transactions |
| `/api/upload/*` | ImgBB image upload |
| `/api/health` | Health check |

All private routes use `authenticate` (JWT or session) plus role middleware. Resource ownership is re-checked against the DB before updates/deletes.

## Verification

```bash
curl http://localhost:5000/api/health
```

## Repository

Server: <https://github.com/muhshin6/wedplan-server>
Client: <https://github.com/muhshin6/wedplan-client>
