import { getCollections } from "../config/collections.js";

export async function createBooking(bookingData) {
  const { bookings } = await getCollections();

  const booking = {
    ...bookingData,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await bookings.insertOne(booking);

  return {
    ...booking,
    _id: result.insertedId,
  };
}

export async function getVendorBookings(vendorId) {
  const { ObjectId } = await import("mongodb");
  const { bookings, services } = await getCollections();

  const vendorBookings = await bookings
    .find({ vendorId })
    .sort({ createdAt: -1 })
    .toArray();

  // Attach the related service information for each booking
  const serviceIds = vendorBookings
    .map((booking) => booking.serviceId)
    .filter((id) => id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const relatedServices = serviceIds.length
    ? await services.find({ _id: { $in: serviceIds } }).toArray()
    : [];

  const serviceMap = new Map(
    relatedServices.map((service) => [String(service._id), service])
  );

  return vendorBookings.map((booking) => ({
    ...booking,
    service: serviceMap.get(String(booking.serviceId)) || null,
  }));
}
