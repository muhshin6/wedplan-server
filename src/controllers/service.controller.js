import { getCollections } from "../config/collections.js";
import { createServiceDocument } from "../models/service.model.js";


// Create Service
export async function createService(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const { name, category, description, location, price, images } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      !location ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price.",
      });
    }

    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be an array.",
      });
    }

    const { services } = await getCollections();

    // Free plan vendors can publish a maximum of 3 active services.
    const currentPlan = req.user.plan || "free";

    if (currentPlan === "free") {
      const activeCount = await services.countDocuments({
        vendorId: req.user.id,
        isActive: true,
      });

      if (activeCount >= 3) {
        return res.status(403).json({
          success: false,
          message:
            "Free plan allows a maximum of 3 active services. Upgrade to Premium for unlimited services.",
        });
      }
    }

    const serviceData = createServiceDocument(
      {
        name,
        category,
        description,
        location,
        price,
        images,
      },
      req.user.id,
    );

    const result = await services.insertOne(serviceData);

    return res.status(201).json({
      success: true,
      message: "Service created successfully. Waiting for admin approval.",
      data: {
        _id: result.insertedId,
        ...serviceData,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Get Vendor Services
export async function getVendorServices(req, res, next) {
  try {
    const { services } = await getCollections();

    const vendorServices = await services
      .find({ vendorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Vendor services fetched successfully.",
      data: vendorServices,
    });
  } catch (error) {
    next(error);
  }
}

// Update Service
export async function updateService(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const { name, category, description, location, price, images, isActive } =
      req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;

    if (price !== undefined) {
      if (!Number.isFinite(Number(price)) || Number(price) < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid price.",
        });
      }

      updates.price = Number(price);
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          message: "Images must be an array.",
        });
      }

      updates.images = images;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Availability must be a boolean value.",
        });
      }

      updates.isActive = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided.",
      });
    }

    updates.updatedAt = new Date();

    const { services } = await getCollections();

    const result = await services.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: req.user.id,
      },
      {
        $set: updates,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you are not the owner.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}

// Delete Service
export async function deleteService(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const { services } = await getCollections();

    const result = await services.deleteOne({
      _id: new ObjectId(id),
      vendorId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you are not the owner.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

// Get Single Public Service By ID
export async function getServiceById(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const { services, users } = await getCollections();

    const service = await services.findOne({
      _id: new ObjectId(id),
      status: "approved",
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or no longer available.",
      });
    }

    // Attach vendor information
    const vendorId = String(service.vendorId);
    const vendor = ObjectId.isValid(vendorId)
      ? await users.findOne({
          $or: [
            { _id: new ObjectId(vendorId) },
            { _id: vendorId },
          ],
        })
      : await users.findOne({ _id: vendorId });

    return res.status(200).json({
      success: true,
      message: "Service retrieved successfully.",
      data: {
        ...service,
        vendor: vendor
          ? { name: vendor.name, businessName: vendor.businessName }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Public Services
export async function getPublicServices(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { services, users } = await getCollections();

    const allServices = await services
      .find({
        status: "approved",
        isActive: true,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Attach vendor information for the service cards
    const vendorIds = [
      ...new Set(allServices.map((service) => String(service.vendorId))),
    ].filter(Boolean);

    const objectIds = vendorIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const vendorDocs = vendorIds.length
      ? await users
          .find({
            $or: [{ _id: { $in: objectIds } }, { _id: { $in: vendorIds } }],
          })
          .toArray()
      : [];

    const vendorMap = new Map(
      vendorDocs.map((vendor) => [
        String(vendor._id),
        { name: vendor.name, businessName: vendor.businessName },
      ])
    );

    const enrichedServices = allServices.map((service) => ({
      ...service,
      vendor: vendorMap.get(String(service.vendorId)) || null,
    }));

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully.",
      data: enrichedServices,
    });
  } catch (error) {
    next(error);
  }
}
// Admin - Get Pending Services
export async function getPendingServices(req, res, next) {
  try {
    const { services } = await getCollections();

    const pendingServices = await services
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Pending services retrieved successfully.",
      data: pendingServices,
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Update Service Status
export async function updateServiceStatus(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected.",
      });
    }

    const { services } = await getCollections();

    const result = await services.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Service ${status} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
// Admin - Get All Services (any status)
export async function getAllServices(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { services, users } = await getCollections();

    const allServices = await services
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const vendorIds = [
      ...new Set(allServices.map((service) => String(service.vendorId))),
    ].filter(Boolean);

    const objectIds = vendorIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const vendorDocs = vendorIds.length
      ? await users
          .find({
            $or: [{ _id: { $in: objectIds } }, { _id: { $in: vendorIds } }],
          })
          .toArray()
      : [];

    const vendorMap = new Map(
      vendorDocs.map((vendor) => [
        String(vendor._id),
        { name: vendor.name, businessName: vendor.businessName },
      ])
    );

    const enriched = allServices.map((service) => ({
      ...service,
      vendor: vendorMap.get(String(service.vendorId)) || null,
    }));

    return res.status(200).json({
      success: true,
      message: "All services retrieved successfully.",
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}

// Admin - Delete any service (including inappropriate published ones)
export async function deleteServiceAdmin(req, res, next) {
  try {
    const { ObjectId } = await import("mongodb");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const { services } = await getCollections();

    const result = await services.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

