import { createBooking, getVendorBookings } from "../models/booking.model.js";
import { getCollections } from "../config/collections.js";
import { ObjectId } from "mongodb";

export async function postBooking(req, res, next) {
  try {
    const {
      serviceId,
      vendorId,
      customerName,
      customerEmail,
      eventDate,
      eventLocation,
      message,
    } = req.body;

    if (
      !serviceId ||
      !vendorId ||
      !customerName ||
      !customerEmail ||
      !eventDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking information.",
      });
    }

    // Only approved and active services can be booked
    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const { services } = await getCollections();
    const serviceDoc = await services.findOne({
      _id: new ObjectId(serviceId),
    });

    if (
      !serviceDoc ||
      serviceDoc.status !== "approved" ||
      serviceDoc.isActive !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "This service is not available for booking.",
      });
    }

    // A vendor cannot book their own service
    if (String(serviceDoc.vendorId) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot book your own service.",
      });
    }

    // Prevent duplicate active requests for the same service and date
    const { bookings } = await getCollections();
    const normalizedDate = new Date(eventDate).toISOString().slice(0, 10);

    const existingBooking = await bookings.findOne({
      serviceId,
      customerId: req.user.id,
      status: { $in: ["pending", "accepted"] },
      eventDate: { $regex: `^${normalizedDate}` },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active booking request for this service on that date.",
      });
    }

    const booking = await createBooking({
      serviceId,
      vendorId,
      customerId: req.user.id,
      customerName,
      customerEmail,
      eventDate,
      eventLocation: eventLocation || "",
      message: message || "",
    });

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully.",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyVendorBookings(req, res, next) {
  try {
    const vendorId = req.user.id;

    const bookings = await getVendorBookings(vendorId);

    res.status(200).json({
      success: true,
      message: "Vendor booking requests retrieved successfully.",
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

// Vendor accepts or rejects a booking request
export async function updateVendorBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected.",
      });
    }

    const { bookings } = await getCollections();

    const booking = await bookings.findOne({
      _id: new ObjectId(id),
      vendorId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending booking requests can be accepted or rejected.",
      });
    }

    await bookings.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: req.user.id,
        status: "pending",
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `Booking request ${status} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyCustomerBookings(req, res, next) {
  try {
    const { bookings } = await getCollections();

    const customerBookings = await bookings
      .find({
        customerId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Customer bookings retrieved successfully.",
      data: customerBookings,
    });
  } catch (error) {
    next(error);
  }
}


export async function cancelCustomerBooking(req, res, next) {
  try {
    const { bookings } = await getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await bookings.findOne({
      _id: new ObjectId(id),
      customerId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be cancelled.",
      });
    }

    await bookings.updateOne(
      {
        _id: new ObjectId(id),
        customerId: req.user.id,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    next(error);
  }
}