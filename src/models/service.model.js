export const SERVICE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export function createServiceDocument(data, vendorId) {
  return {
    vendorId,

    name: data.name,
    category: data.category,
    description: data.description,
    location: data.location,
    price: Number(data.price),
    images: data.images || [],

    status: SERVICE_STATUS.PENDING,
    isActive: true,

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
