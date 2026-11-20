import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

export async function verifyToken(req, res, next) {
  try {
    // Get user session from Better Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // Check if user is authenticated
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    // Attach user information to request
    req.user = session.user;
    req.session = session.session;

    next();
  } catch (error) {
    next(error);
  }
}
