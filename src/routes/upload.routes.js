import express from "express";
import multer from "multer";

import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadImage } from "../controllers/upload.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
  },
});

router.post("/image", authenticate, upload.single("image"), uploadImage);

export default router;
