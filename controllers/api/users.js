const User = require("../../models/user");
const Booking = require("../../models/booking"); // Note: capitalization standard
const Listing = require("../../models/listing");
const { getPersonalizedRecommendations } = require("../../utils/aiService");

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);

        // Log the user in immediately after signup
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            res.status(201).json({
                message: "Welcome to StayNest!",
                user: { _id: registeredUser._id, username: registeredUser.username }
            });
        });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

module.exports.login = async (req, res) => {
    // Passport middleware handles the auth check before this runs
    res.status(200).json({
        message: "Welcome back!",
        user: {
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.status(200).json({ message: "Logged out successfully" });
    });
};

module.exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch Standard Dashboard Data (Parallel)
        const [myBookings, myListings] = await Promise.all([
            Booking.find({ user: userId }).populate("listing"),
            Listing.find({ owner: userId })
        ]);

        const bookingsOnMyListings = await Booking.find({
            listing: { $in: myListings.map(l => l._id) }
        })
            .populate("user")
            .populate("listing");

        // 2. --- AI INTEGRATION: Personalized Recommendations ---
        // Combine Watchlist + ViewedHistory for the AI
        // (Assuming req.user is populated, if not we might need to fetch it)
        const userWithHistory = await User.findById(userId);

        const pastBookingIds = myBookings
            .filter(b => b.listing)
            .map(b => b.listing_id);

        let historyIds = [
            ...(userWithHistory.watchlist || []),
            ...(userWithHistory.viewedHistory || []),
            ...pastBookingIds
        ];

        // Ensure IDs are strings for Python
        historyIds = [...new Set(historyIds.map(id => id.toString()))];

        let aiRecommendations = [];
        if (historyIds.length > 0) {
            console.log(`🤖 Fetching AI Recs based on ${historyIds.length} items...`);
            aiRecommendations = await getPersonalizedRecommendations(historyIds);
        }
        // -----------------------------------------------------

        res.status(200).json({
            myBookings,
            myListings,
            bookingsOnMyListings,
            recommendations: aiRecommendations // <--- The new AI data
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to load dashboard data" });
    }
};

// Bonus: Helper to fetch current user status (useful for Next.js init)
module.exports.getCurrentUser = (req, res) => {
    if (!req.user) return res.status(200).json({ user: null });
    res.status(200).json({ user: req.user });
};

module.exports.addToHistory = async (req, res) => {
    const { listingId } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { viewedHistory: listingId }
    });
    res.status(200).json({ message: "History updated" });
};

module.exports.toggleWatchlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { listingId } = req.body;

        const user = User.findById(userId);

        const isInWatchlist = user.watchlist.includes(listingId);

        if (isInWatchlist) {
            await User.findByIdAndUpdate(userId, {
                $pull: { watchlist: listingId }
            });
            res.status(200).json({ message: "Removed from watchlist", action: "removed" });
        } else {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { watchlist: listingId }
            });
            res.status(200).json({ message: "Added to watchlist", action: "added" });
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to toggle watchlist" });
    }
}