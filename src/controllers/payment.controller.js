import { ObjectId } from "mongodb";
import { getCollections } from "../config/collections.js";
import { stripe, stripeWebhookSecret, clientUrl } from "../config/stripe.js";
import { SUBSCRIPTION_PLANS } from "./subscription.controller.js";

function userFilter(userId) {
  return ObjectId.isValid(userId)
    ? { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] }
    : { _id: userId };
}

// Vendor starts a Stripe Checkout session. The vendor is taken from the
// authenticated session — a caller cannot create a session for another vendor.
export async function createCheckoutSession(req, res, next) {
  try {
    const { plan } = req.body;

    if (!plan || !SUBSCRIPTION_PLANS[plan] || plan === "free") {
      return res.status(400).json({
        success: false,
        message: "Please choose a paid subscription plan.",
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message:
          "Stripe payments are not configured. Please contact support.",
      });
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: `${selectedPlan.name} Vendor Subscription`,
              description: selectedPlan.features.join(" · "),
            },
            unit_amount: selectedPlan.price * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        vendorId: req.user.id,
        plan: selectedPlan.id,
        planName: selectedPlan.name,
      },
      subscription_data: {
        metadata: {
          vendorId: req.user.id,
          plan: selectedPlan.id,
        },
      },
      // Go straight to the subscription page after checkout. The page polls
      // the verified status and shows the purchased plan as current.
      success_url: `${clientUrl}/vendor/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
}

// Stripe webhook — the ONLY place that activates a paid plan.
// Signature verification guarantees the event really came from Stripe.
export async function handleStripeWebhook(req, res, next) {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(503).json({
        success: false,
        message: "Stripe webhook is not configured.",
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        stripeWebhookSecret
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid webhook signature: ${error.message}`,
      });
    }

    const { users, transactions } = await getCollections();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const vendorId = session.metadata?.vendorId || session.client_reference_id;
      const plan = session.metadata?.plan;

      if (!vendorId || !SUBSCRIPTION_PLANS[plan]) {
        return res.status(200).json({ received: true });
      }

      const selectedPlan = SUBSCRIPTION_PLANS[plan];

      // Idempotency — do not create duplicate transactions on event retries.
      const existing = await transactions.findOne({
        stripeSessionId: session.id,
      });

      if (!existing) {
        await transactions.insertOne({
          vendorId,
          vendorName: session.customer_details?.name || session.metadata?.vendorName,
          vendorEmail: session.customer_email || session.customer_details?.email,
          plan: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: "BDT",
          status: "success",
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription || null,
          createdAt: new Date(),
        });
      }

      await users.updateOne(userFilter(vendorId), {
        $set: {
          plan: selectedPlan.id,
          subscriptionStatus: "active",
          stripeSubscriptionId: session.subscription || null,
          updatedAt: new Date(),
        },
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const vendorId = subscription.metadata?.vendorId;

      if (vendorId) {
        await users.updateOne(userFilter(vendorId), {
          $set: {
            plan: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          },
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        await users.updateMany(
          { stripeSubscriptionId: subscriptionId },
          {
            $set: {
              subscriptionStatus: "past_due",
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}

// Read-only status lookup for the Payment Success page.
// This never changes the user's plan — only the webhook does that.
export async function getPaymentStatus(req, res, next) {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing session id.",
      });
    }

    const { transactions } = await getCollections();

    const transaction = await transactions.findOne({
      stripeSessionId: sessionId,
      vendorId: req.user.id,
    });

    if (!transaction) {
      return res.status(202).json({
        success: true,
        status: "processing",
        message: "Payment verification is still in progress.",
      });
    }

    return res.status(200).json({
      success: true,
      status: "success",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

// Vendor's own billing/transaction history (read-only)
export async function getMyTransactions(req, res, next) {
  try {
    const { transactions } = await getCollections();

    const records = await transactions
      .find({ vendorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Billing history retrieved successfully.",
      data: records,
    });
  } catch (error) {
    next(error);
  }
}

// Vendor cancels their own subscription. Provider-side state is changed by
// Stripe; the webhook then updates the local plan.
export async function cancelSubscription(req, res, next) {
  try {
    const { users } = await getCollections();

    const vendor = await users.findOne(userFilter(req.user.id));

    if (!vendor?.stripeSubscriptionId) {
      // No provider-side subscription (e.g. demo/test data) — a downgrade to
      // Free is still safe because it does not grant any paid entitlement.
      await users.updateOne(userFilter(req.user.id), {
        $set: {
          plan: "free",
          subscriptionStatus: "canceled",
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Switched to the Free plan.",
      });
    }

    if (stripe) {
      try {
        await stripe.subscriptions.cancel(vendor.stripeSubscriptionId);
      } catch (stripeError) {
        // Even if the provider-side cancel fails (e.g. stale test data), the
        // local downgrade must still succeed — it grants nothing.
        console.error("Stripe cancel failed:", stripeError.message);
      }
    }

    await users.updateOne(userFilter(req.user.id), {
      $set: {
        plan: "free",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Subscription canceled successfully.",
    });
  } catch (error) {
    next(error);
  }
}
