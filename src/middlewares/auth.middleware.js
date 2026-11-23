import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";
import { auth } from "../config/auth.js";
import { getCollections } from "../config/collections.js";

export const authenticate = async (req, res, next) => {
  try {
    let userId;
    let session = null;

    const authHeader = req.headers.authorization || "";

    if (authHeader.startsWith("Bearer ")) {
      // JWT flow — verify signature/expiry on the server. The user id comes
      // from the verified token payload, never from the request body.
      const token = authHeader.slice(7).trim();

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Missing token.",
        });
      }

      const verified = await auth.api.verifyJWT({ body: { token } });
      const payload = verified?.payload || verified?.data?.payload;

      if (!payload?.sub) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Invalid or expired token.",
        });
      }

      userId = payload.sub;
    } else {
      // Cookie session flow (existing client behaviour)
      session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login first.",
        });
      }

      userId = session.user.id;
    }

    // Always read the live user record so a block applied by an admin
    // takes effect immediately, and roles/ids are never trusted from client.
    const { users } = await getCollections();

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

    req.user = { ...(session?.user || {}), ...userDoc, id: userId };
    req.session = session?.session || null;

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
