export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "ImgBB API key is not configured.",
      });
    }

    const formData = new FormData();

    const imageBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype,
    });

    formData.append("image", imageBlob, req.file.originalname);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to ImgBB.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      data: {
        url: result.data.url,
        displayUrl: result.data.display_url,
        deleteUrl: result.data.delete_url,
      },
    });
  } catch (error) {
    next(error);
  }
}
