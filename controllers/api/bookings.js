const Booking = require("../../models/booking");
const Listing = require("../../models/listing");
const Stripe = require("stripe");
const Notification = require("../../models/notification");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../../models/user");

module.exports.initiateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, guestCount } = req.body;
        const userId = req.user._id;

        if (!startDate || !endDate || !guestCount) {
            return res.status(400).json({ message: "Missing required booking details" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const listing = await Listing.findById(id).populate("owner");
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.owner._id.toString() === userId.toString()) {
            return res.status(403).json({
                message: "You cannot book your own sanctuary.",
                error: "self_booking_not_allowed"
            });
        }

        const overlappingBooking = await Booking.findOne({
            listing: id,
            status: "confirmed",
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start }
                }
            ]
        });

        if (overlappingBooking) {
            return res.status(409).json({ message: "Dates already booked" })
        }

        const days = (end - start) / (1000 * 60 * 60 * 24);
        const totalPrice = days * listing.price;

        const newBooking = await Booking.create({
            listing: id,
            user: req.user._id,
            startDate: start,
            endDate: end,
            guestCount,
            totalPrice,
            status: "pending",
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalPrice * 100,
            currency: "inr",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingId: newBooking._id.toString(),
                listingId: id,
                userId: req.user._id.toString()
            }
        })

        newBooking.paymentIntentId = paymentIntent.id;
        await newBooking.save();
        // --- REAL-TIME NOTIFICATION (Bucket 1) ---

        // 1. Create DB Record (For history)
        const notification = await Notification.create({
            recipient: listing.owner._id,
            sender: req.user._id,
            type: "BOOKING_REQUEST",
            message: `New booking request for ${listing.title}`,
            relatedId: newBooking._id,
            relatedModel: "Booking"
        });

        // 2. Emit Socket Event (For instant popup)
        // We send to the room named after the Owner's ID
        req.io.to(listing.owner._id.toString()).emit("new_notification", {
            message: notification.message,
            type: notification.type,
            sender: req.user.username
        });

        return res.status(201).json({
            clientSecret: paymentIntent.client_secret,
            bookingId: newBooking._id,
            totalPrice
        })
    } catch (error) {
        console.error("Booking Init Error:", error);
        res.status(500).json({ message: "Failed to initiate booking", error: error.message });
    }
}

module.exports.getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate("listing");
        if (!booking) return res.status(404).json({ message: "Not found" })
        res.json(booking);
    } catch (error) {
        console.error("Could not get booking: ", error.message);
        res.status(500).json({ message: "Error fetching booking" });
    }
}

// module.exports.confirmBooking = async (req, res) => {
//     try {
//         const { bookingId } = req.body;
//         const { paymentIntentId } = req.body;

//         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//         if (paymentIntent.status !== 'succeeded') {
//             return res.status(400).json({ message: "Payment not verified" });
//         }

//         const booking = await Booking.findByIdAndUpdate(
//             bookingId,
//             { status: "confirmed" },
//             { new: true }
//         ).populate("listing");

//         const listing = await Listing.findById(booking.listing._id);

//         const guestNotif = await Notification.create({
//             recipient: booking.user,
//             type: "BOOKING_CONFIRMED",
//             message: `Your stay at ${booking.listing.title} is confirmed!`,
//             relatedId: booking._id
//         });

//         req.io.to(booking.user.toString()).emit("new_notification", guestNotif);

//         const hostNotif = Notification.create({
//             recipient: listing.owner,
//             sender: booking.user,
//             type: "PAYMENT_RECEIVED",
//             message: `Payment received for ${listing.title}`,
//             relatedId: booking._id
//         })

//         req.io.to(listing.owner.toString()).emit("new_notification", hostNotif);

//         res.status(200).json({ message: "Booking confirmed!", booking });
//     } catch (error) {
//         res.status(500).json({ message: "Confirmation failed" });
//     }
// }

module.exports.getBookingsForListing = async (req, res) => {
    try {
        const { id } = req.params;
        const bookings = await Booking.find({ listing: id, status: "confirmed" }).select("startDate endDate").lean();

        res.status(200).json(bookings);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Failed to fetch bookings" });
    }
}

module.exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        booking.status = "cancelled";
        await booking.save();

        try {
            const formattedDate = new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // A. Notify Guest (Current User)
            const guestNotification = await Notification.create({
                recipient: req.user._id,
                type: "CANCELLED",
                message: `Your booking for ${booking.listing.title} has been successfully cancelled.`,
                relatedId: booking._id,
                relatedModel: "Booking"
            });
            if (req.io) req.io.to(req.user._id.toString()).emit("new_notification", guestNotification);

            // B. Notify Host
            // Check if owner exists to prevent crashes
            if (booking.listing.owner && booking.listing.owner.toString() !== req.user._id.toString()) {
                const hostNotification = await Notification.create({
                    recipient: booking.listing.owner,
                    type: "CANCELLED",
                    message: `Booking Cancelled: ${booking.listing.title} for ${formattedDate} is now free.`,
                    relatedId: booking._id,
                    relatedModel: "Booking"
                });
                if (req.io) req.io.to(booking.listing.owner.toString()).emit("new_notification", hostNotification);
            }

            // C. Notify Watchers
            const watchers = await User.find({
                watchlist: booking.listing._id,
                _id: { $ne: req.user._id }
            });

            for (const watcher of watchers) {
                const notif = await Notification.create({
                    recipient: watcher._id,
                    type: "AVAILABILITY_ALERT",
                    message: `Good news! Date for ${booking.listing.title} just opened up (Starting ${formattedDate})`,
                    relatedId: booking.listing._id,
                    relatedModel: "Listing"
                });
                if (req.io) req.io.to(watcher._id.toString()).emit("new_notification", notif);
            }

        } catch (notifError) {
            // Log the error but DO NOT fail the request
            console.error("⚠️ Notification failed, but booking was cancelled:", notifError.message);
        }

        res.status(200).json({ message: "Booking cancelled" });
    } catch (error) {
        res.status(500).json({ message: "Cancellation failed" });
    }
}