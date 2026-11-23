import Stripe from "stripe";

// Secret key stays on the server only — never sent to the client.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
export const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
