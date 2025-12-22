const Listing = require("../../models/listing");
const Review = require("../../models/review");

module.exports.createReview = async (req, res) => {
    try {
        let listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        let newReview = new Review(req.body.review);
        newReview.author = req.user._id;

        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();

        // --- NOTIFICATION TRIGGER: NEW REVIEW ---
        const notif = await Notification.create({
            recipient: listing.owner._id, // The Host
            sender: req.user._id,         // The Reviewer
            type: "NEW_REVIEW",
            message: `New ${newReview.rating} review from ${req.user.username} on ${listing.title}!`,
            relatedId: listing._id,
            relatedModel: "Listing"
        });

        // Real-Time Alert (Socket.io)
        if (req.io) {
            req.io.to(listing.owner._id.toString()).emit("new_notification", notif);
        }

        await newReview.populate("author", "username");

        res.status(201).json({
            message: "Review created successfully",
            review: newReview
        })
    } catch (error) {
        res.status(500).json({ message: "Failed to create review", error: error.message });
    }
}

module.exports.destroyReview = async (req, res) => {
    try {
        let { id, reviewId } = req.params;

        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

        await Review.findByIdAndDelete(reviewId);

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete review", error: error.message });
    }
}