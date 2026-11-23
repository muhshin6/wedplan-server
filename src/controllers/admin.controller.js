import { ObjectId } from "mongodb";
import { getCollections } from "../config/collections.js";

// Admin - Dashboard Statistics
export async function getAdminStats(req, res, next) {
  try {
    const {
      users,
      services,
      transactions,
    } = await getCollections();

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    ] = await Promise.all([
      users.countDocuments(),

      users.countDocuments({
        role: "vendor",
      }),

      users.countDocuments({
        role: "customer",
      }),

      services.countDocuments(),

      services.countDocuments({
        status: "pending",
      }),

      transactions.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin statistics retrieved successfully.",
      data: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalServices,
        pendingServices,
        totalTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Get Recent Bookings
export async function getRecentBookings(req, res, next) {
  try {
    const { bookings } = await getCollections();

    const recentBookings = await bookings
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Recent bookings retrieved successfully.",
      data: recentBookings,
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Get All Users
export async function getAllUsers(req, res, next) {
  try {
    const { users } = await getCollections();

    const allUsers = await users
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            image: 1,
            isBlocked: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: allUsers,
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Get platform transactions (read-only; records cannot be modified)
export async function getTransactions(req, res, next) {
  try {
    const { transactions } = await getCollections();

    const allTransactions = await transactions
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully.",
      data: allTransactions,
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Block or unblock a user
export async function setUserBlocked(req, res, next) {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isBlocked must be a boolean value.",
      });
    }

    const { users } = await getCollections();

    const filter = {
      $or: [
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
        { _id: id },
      ],
    };

    const result = await users.updateOne(filter, {
      $set: { isBlocked, updatedAt: new Date() },
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: isBlocked
        ? "User blocked successfully."
        : "User unblocked successfully.",
    });
  } catch (error) {
    next(error);
  }
}