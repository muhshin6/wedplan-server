import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";
import { auth } from "../config/auth.js";
import { getCollections } from "../config/collections.js";

export const authenticate = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    // Always read the live user record so a block applied by an admin
    // takes effect immediately, even with an existing session cookie.
    const { users } = await getCollections();
    const userId = session.user.id;

    const userDoc = await users.findOne({
      $or: [
        ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : []),
        { _id: userId },
      ],
    });

    if (!userDoc) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please login again.",
      });
    }

    if (userDoc.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    req.user = { ...session.user, ...userDoc };
    req.session = session.session;

    next();
  } catch (error) {
    console.error("Authentication Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission.",
      });
    }

    next();
  };
}
