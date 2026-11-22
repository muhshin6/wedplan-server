import { getCollections } from "../config/collections.js";

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    maxActiveServices: 3,
    hasPremiumBadge: false,
    features: [
      "Maximum 3 active services",
      "Basic Vendor Dashboard",
      "Booking Request Management",
    ],
  },
  basic: {
    id: "basic",
    name: "Basic",
    maxActiveServices: 10,
    hasPremiumBadge: false,
    features: [
      "Maximum 10 active services",
      "Basic Vendor Dashboard",
      "Booking Request Management",
      "Email support",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    maxActiveServices: null,
    hasPremiumBadge: true,
    features: [
      "Unlimited active services",
      "Premium Vendor Badge",
      "All Free Plan Features",
    ],
  },
};

export async function getSubscription(req, res, next) {
  try {
    const planId = req.user.plan || "free";
    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;

    return res.status(200).json({
      success: true,
      message: "Subscription retrieved successfully.",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function upgradeSubscription(req, res, next) {
  try {
    const { plan } = req.body;

    if (!SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    const { ObjectId } = await import("mongodb");
    const { users } = await getCollections();

    // The MongoDB adapter may store _id as either an ObjectId or a string.
    const userFilter = ObjectId.isValid(req.user.id)
      ? { $or: [{ _id: new ObjectId(req.user.id) }, { _id: req.user.id }] }
      : { _id: req.user.id };

    const result = await users.updateOne(userFilter, {
      $set: {
        plan,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Subscription upgraded to ${SUBSCRIPTION_PLANS[plan].name} plan.`,
      data: SUBSCRIPTION_PLANS[plan],
    });
  } catch (error) {
    next(error);
  }
}
