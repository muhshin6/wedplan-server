import express from "express";
import {
  postBooking,
  getMyVendorBookings,
  getMyCustomerBookings,
  cancelCustomerBooking,
  updateVendorBookingStatus,
} from "../controllers/booking.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// Customer creates a booking request
router.post("/", authenticate, authorizeRoles("customer"), postBooking);

// Vendor gets their booking requests
router.get(
  "/vendor/my-bookings",
  authenticate,
  authorizeRoles("vendor"),
  getMyVendorBookings,
);

// Vendor accepts or rejects their own booking requests
router.patch(
  "/vendor/:id/status",
  authenticate,
  authorizeRoles("vendor"),
  updateVendorBookingStatus,
);

router.get(
  "/customer/my-bookings",
  authenticate,
  authorizeRoles("customer"),
  getMyCustomerBookings,
);

router.patch(
  "/customer/my-bookings/:id/cancel",
  authenticate,
  authorizeRoles("customer"),
  cancelCustomerBooking,
);

export default router;
