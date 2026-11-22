import express from "express";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Authenticated users only
router.get("/profile", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Authentication successful!",
    user: req.user,
  });
});

// Vendor only
router.get("/vendor", authenticate, authorizeRole("vendor"), (req, res) => {
  res.json({
    success: true,
    message: "Welcome Vendor!",
  });
});

// Customer only
router.get("/customer", authenticate, authorizeRole("customer"), (req, res) => {
  res.json({
    success: true,
    message: "Welcome Customer!",
  });
});

export default router;
