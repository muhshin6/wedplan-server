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