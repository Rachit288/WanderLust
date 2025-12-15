const e = require("connect-flash");
const Booking = require("../../models/booking");
const Listing = require("../../models/listing");

module.exports.createBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, guestCount, totalPrice } = req.body;

        if (!startDate || !endDate || !guestCount || !totalPrice) {
            return res.status(400).json({ message: "Missing required booking details" });
        }

        const listing = Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        const overlappingBooking = await Booking.findOne({
            listing: id,
            $or: [
                {
                    startDate: { $lte: new Date(endDate) },
                    endDate: { $gte: new Date(startDate) }
                }
            ]
        });

        if (overlappingBooking) {
            return res.status(409).json({ message: "Selected dates " })
        }

        const newBooking = new Booking({
            listing: id,
            user: req.user._id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            guestCount,
            totalPrice
        });

        await newBooking.save();

        return res.status(201).json({
            message: "Booking successful!",
            booking: newBooking
        })
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ message: "Failed to create booking", error: error.message });
    }
}

module.exports.getBookingsForListing = async (req, res) => {
    try {
        const { id } = req.params;
        const bookings = Booking.find({ listing: id }).select("startDate endDate");

        res.status(200).json(bookings);
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch bookings" });
    }
}