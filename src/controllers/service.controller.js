import { getCollections } from "../config/collections.js";
import { createServiceDocument } from "../models/service.model.js";

export async function createService(req, res, next) {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const { name, category, description, location, price, images } = req.body;

    // Validate required fields
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

    // Validate price
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price.",
      });
    }

    // Validate images
    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be an array.",
      });
    }

    // Create service document
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

    // Save service to MongoDB
    const { services } = await getCollections();

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
