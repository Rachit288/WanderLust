const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../../models/booking');
const Listing = require('../../models/listing');
const Notification = require('../../models/notification');
const User = require('../../models/user'); // Assuming you have User model

module.exports.handleWebhook = async (req, res) => {
    console.log("🔥 STRIPE WEBHOOK RECEIVED");
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verify the event came from Stripe (Critical Security Step)
        // You need to add STRIPE_WEBHOOK_SECRET to your .env file
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the specific event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;

        // Retrieve metadata we sent during checkout
        const { bookingId, listingId, userId } = paymentIntent.metadata;

        console.log(`💰 Payment captured for Booking ${bookingId}`);

        try {
            // 3. Confirm the Booking in DB
            const booking = await Booking.findOneAndUpdate(
                { paymentIntentId: paymentIntent.id },
                { status: "confirmed" },
                { new: true }
            ).populate("listing");

            if (!booking) {
                console.error("Booking not found via Webhook metadata");
                return res.status(404).json({ error: "Booking not found" });
            }

            const listing = await Listing.findById(listingId).populate("owner");

            // 4. Send Real-time Notifications (Same logic as before)

            // A. Notify Guest
            const guestNotif = await Notification.create({
                recipient: userId,
                type: "BOOKING_CONFIRMED",
                message: `Your stay at ${listing.title} is confirmed!`,
                relatedId: booking._id,
                relatedModel: "Booking"
            });
            // Note: req.io might not work here if webhook is separate process. 
            // Better to use a global IO instance or just save to DB.
            if (global.io) global.io.to(userId).emit("new_notification", guestNotif);

            // B. Notify Host
            const hostNotif = await Notification.create({
                recipient: listing.owner._id,
                sender: userId,
                type: "PAYMENT_RECEIVED",
                message: `Payment received for ${listing.title}`,
                relatedId: booking._id,
                relatedModel: "Booking"
            });
            if (global.io) global.io.to(listing.owner._id.toString()).emit("new_notification", hostNotif);

            console.log("✅ Booking Confirmed & Notified");

        } catch (err) {
            console.error("Error updating booking in webhook:", err);
            // Don't send 500, or Stripe will retry endlessly. Log it and investigate.
        }
    }

    // Return 200 to Stripe quickly
    res.json({ received: true });
};