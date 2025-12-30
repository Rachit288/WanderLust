const Listing = require("../../models/listing");
const Review = require("../../models/review");
const Notification = require("../../models/notification");

module.exports.createReview = async (req, res) => {
    try {
        let listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.owner.equals(req.user._id)) {
            return res.status(403).json({ message: "You cannot review your own property." });
        }

        let newReview = new Review(req.body.review);
        newReview.author = req.user._id;

        const currentAvg = listing.averageRating || 0;
        const currentCount = listing.totalReviews || 0;
        const newRating = newReview.rating;

        const newAverage = ((currentAvg * currentCount) + newRating) / (currentCount + 1);

        // 2. Update Listing Fields
        listing.averageRating = newAverage;
        listing.totalReviews = currentCount + 1;

        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();

        // --- NOTIFICATION TRIGGER: NEW REVIEW ---
        const notif = await Notification.create({
            recipient: listing.owner._id, // The Host
            sender: req.user._id,         // The Reviewer
            type: "NEW_REVIEW",
            message: `New ${newReview.rating}★ review from ${req.user.username} on ${listing.title}!`,
            relatedId: listing._id,
            relatedModel: "Listing"
        });

        // Real-Time Alert (Socket.io)
        if (req.io) {
            const ownerId = typeof listing.owner === 'object' ? listing.owner._id.toString() : listing.owner.toString();
            req.io.to(ownerId).emit("new_notification", notif);
            req.io.to(listing.owner._id.toString()).emit("new_notification", notif);
        }

        await newReview.populate("author", "username");

        res.status(201).json({
            message: "Review created successfully",
            review: newReview,
            newAverage: listing.averageRating,
            totalReviews: listing.totalReviews
        })
    } catch (error) {
        res.status(500).json({ message: "Failed to create review", error: error.message });
    }
}

module.exports.destroyReview = async (req, res) => {
    try {
        let { id, reviewId } = req.params;
        const review = await Review.findById(reviewId);
        const listing = await Listing.findById(id);

        if (!review || !listing) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // --- VALIDATION: Only author can delete their review ---
        if (!review.author.equals(req.user._id)) {
            return res.status(403).json({ message: "You do not have permission to delete this review." });
        }
        // ------------------------------------------------------

        // 1. Reverse the Weighted Average
        const currentAvg = listing.averageRating;
        const currentCount = listing.totalReviews;
        const oldRating = review.rating;

        if (currentCount > 1) {
            listing.averageRating = ((currentAvg * currentCount) - oldRating) / (currentCount - 1);
            listing.totalReviews = currentCount - 1;
        } else {
            listing.averageRating = 0;
            listing.totalReviews = 0;
        }

        // 2. Remove Review
        await Listing.findByIdAndUpdate(id, {
            $pull: { reviews: reviewId },
            $set: {
                averageRating: listing.averageRating,
                totalReviews: listing.totalReviews
            }
        });

        await Review.findByIdAndDelete(reviewId);

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete review", error: error.message });
    }
}