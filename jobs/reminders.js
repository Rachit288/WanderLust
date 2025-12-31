const cron = require('node-cron');
const Booking = require("../models/booking");
const Notification = require("../models/notification");
const Listing = require('../models/listing');
const User = require('../models/user');
const { getPersonalizedRecommendations } = require('../utils/aiService');

module.exports.startReminders = (io) => {
    cron.schedule("0 9 * * *", async () => {
        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // 1. Define "Tomorrow" (For Check-ins)
            const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
            const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

            // 2. Define "Today" (For Checkouts)
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            // 3. Define "Yesterday" (For Reviews & Abandoned Carts)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
            const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

            const upcomingBookings = Booking.find({
                startDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
                status: "confirmed"
            }).populate("listing");

            for (const booking of upcomingBookings) {
                const notif = await Notification.create({
                    recipient: booking.user,
                    type: "REMINDER",
                    message: `Pack your bags! Your stay at ${booking.listing.title} starts tomorrow.`,
                    relatedId: booking._id,
                    relatedModel: "Booking"
                });

                io.to(booking.user.toString()).emit("new_notification", notif);
                console.log(`Sent Check-in Reminder to User ${booking.user}`);
            }

            const checkoutBookings = await Booking.find({
                endDate: { $gte: startOfToday, $lte: endOfToday },
                status: "confirmed"
            }).populate("listing");

            for (const booking of checkoutBookings) {
                const notif = await Notification.create({
                    recipient: booking.user,
                    type: "REMINDER",
                    message: `Hope you enjoyed your stay! Checkout at ${booking.listing.title} is at 11:00 AM.`,
                    relatedId: booking._id,
                    relatedModel: "Booking"
                });

                io.to(booking.user.toString()).emit("new_notification", notif);
                console.log(`Sent Checkout Reminder to User ${booking.user}`);
            }

            // --- REVIEW REQUEST (Trip Ended Yesterday) ---
            const completedBookings = await Booking.find({
                endDate: { $gte: startOfYesterday, $lte: endOfYesterday },
                status: "confirmed"
            }).populate("listing");

            for (let booking of completedBookings) {
                const notif = await Notification.create({
                    recipient: booking.user,
                    type: "REVIEW_REQUEST",
                    message: `How was your stay at ${booking.listing.title}? Rate your experience!`,
                    relatedId: booking.listing._id, // Link to Listing so they can review it
                    relatedModel: "Listing"
                });

                // Send Socket Event
                io.to(booking.user.toString()).emit("new_notification", notif);
                console.log(`Sent Review Request to User ${booking.user}`);
            }

            // --- UNFINISHED BOOKING (Abandoned Cart from Yesterday) ---
            // Finds bookings created yesterday that are still "pending"
            const abandonedBookings = await Booking.find({
                createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
                status: "pending"
            }).populate("listing");

            for (let booking of abandonedBookings) {
                const notif = await Notification.create({
                    recipient: booking.user,
                    type: "UNFINISHED_BOOKING",
                    message: `Still dreaming about ${booking.listing.title}? Complete your booking now!`,
                    relatedId: booking._id,
                    relatedModel: "Booking"
                });

                io.to(booking.user.toString()).emit("new_notification", notif);
                console.log(`Sent Abandoned Cart Reminder to User ${booking.user}`);
            }

        } catch (error) {
            console.error("⚠️ Reminder Job Failed:", error);
        }
    })

    cron.schedule("0 10 * * 1", async () => {
        console.log("❤️ Running Weekly Wishlist Summary...");

        try {
            const listings = await Listing.find({}).populate("owner");

            for (const listing of listings) {
                const count = await User.countDocuments({ wishlist: listing._id });

                if (count > 0) {
                    const notif = await Notification.create({
                        recipient: listing.owner._id,
                        type: "WISHLIST_ALERT",
                        message: `Good news! ${count} people have your '${listing.title}' in their wishlist this week.`,
                        relatedId: listing._id,
                        relatedModel: "Listing"
                    });

                    // Send Real-Time Alert
                    io.to(listing.owner._id.toString()).emit("new_notification", notif);
                    console.log(`Sent Wishlist Alert to Host ${listing.owner.username}`);
                }
            }
        } catch (error) {
            console.error("⚠️ Wishlist Job Failed:", error);
        }
    })
    cron.schedule("0 17 * * 5", async () => {
        console.log("🤖 Running Weekly AI Recommendations...");
        try {
            const users = await User.find({
                $or: [{ viewedHistory: { $not: { $size: 0 } } }, { watchlist: { $not: { $size: 0 } } }]
            });

            for (const user of users) {
                const historyIds = [
                    ...(user.watchlist || []),
                    ...(user.viewedHistory || [])
                ].map(id => id.toString());

                if (historyIds.length > 0) {
                    const recommendations = await getPersonalizedRecommendations(historyIds);

                    if (recommendations && recommendations.length > 0) {
                        const topPick = recommendations[0];

                        // --- PERSONALIZED COPYWRITING ---
                        // Check the category of the pick
                        // e.g., if category is "Amazing Pools", message becomes:
                        // "Love Amazing Pools? We found a gem for you: [Title]"

                        let intro = "We think you'll love";
                        if (topPick.category && topPick.category.length > 0) {
                            // Pick the first category of the listing
                            intro = `Love ${topPick.category[0]}? Check out`;
                        }

                        const message = `${intro} ${topPick.title} for your next trip.`;

                        const notif = await Notification.create({
                            recipient: user._id,
                            type: "AI_RECOMMENDATION",
                            message: message,
                            relatedId: topPick._id,
                            relatedModel: "Listing"
                        })

                        io.to(user._id.toString()).emit("new_notification", notif);
                        
                        console.log(`Sent AI Rec to ${user.username}`);
                    }
                }
            }
        } catch (error) {
            console.error("⚠️ AI Job Failed:", error);
        }
    })

    cron.schedule("0 18 * * 3", async () => {
        console.log("📅 Running Weekend Availability Check...");

        try {
            const today = new Date();
            const saturday = new Date(today);
            saturday.setDate(today.getDate() + (6 - today.getDay()));
            saturday.setHours(0, 0, 0, 0);

            const sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1);
            sunday.setHours(23, 59, 59, 999);

            const users = await User.find({ watchlist: { $not: { $size: 0 } } }).populate("watchlist");

            for (const user of users) {
                for (const listing of user.watchlist) {
                    const conflict = await Booking.findOne({
                        listing: listing._id,
                        status: "confirmed",
                        $or: [
                            { startDate: { $lte: sunday }, endDate: { $gte: saturday } }
                        ]
                    });

                    if (!conflict) {
                        const notif = await Notification.create({
                            recipient: user._id,
                            type: "AVAILABILITY_ALERT",
                            message: `Plan a getaway? ${listing.title} is free this weekend!`,
                            relatedId: listing._id,
                            relatedModel: "Listing"
                        })

                        io.to(user._id.toString()).emit("new_notification", notif);

                        // Limit to 1 notification per user per week to avoid spamming
                        break;
                    }
                }
            }
        } catch (error) {
            console.error("⚠️ Weekend Check Failed:", error);
        }
    })
}