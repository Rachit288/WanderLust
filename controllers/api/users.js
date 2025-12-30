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

module.exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookings = await Booking.find({ user: userId })
      .populate("listing", "title location image price")
      .sort({ startDate: -1 })

    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
}

module.exports.getMyListings = async (req, res) => {
  const userId = req.user._id;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(15, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const [listings, total] = await Promise.all([
    Listing.find({ owner: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Listing.countDocuments({ owner: userId })
  ]);

  res.json({
    listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  });
};


module.exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "watchlist",
        select: "title location price image"
      });

    res.json({ watchlist: user.watchlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch watchlist" });
  }
}

module.exports.getAIRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("watchlist viewedHistory");

    const historyIds = [
      ...(user.watchlist || []),
      ...(user.viewedHistory || [])
    ].map(id => id.toString());

    if (historyIds.length === 0) {
      return res.json({ recommendations: [] });
    }

    const recommendations = await getPersonalizedRecommendations(historyIds);

    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "AI recommendation failed" });
  }
}

module.exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const [myBookings, myListings] = await Promise.all([
      Booking.find({ user: userId })
        .populate("listing", "title location image price")
        .limit(10),

      Listing.find({ owner: userId })
        .select("title location image price")
        .limit(12)
    ]);

    res.status(200).json({
      myBookings,
      myListings,
      bookingsOnMyListings: myBookings.length,
      recommendations: [] // load later
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

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Safety: ensure watchlist always exists
    const watchlist = user.watchlist || [];

    const isInWatchlist = watchlist.includes(listingId);

    if (isInWatchlist) {
      await User.findByIdAndUpdate(userId, {
        $pull: { watchlist: listingId }
      });

      return res.status(200).json({
        message: "Removed from watchlist",
        action: "removed"
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { watchlist: listingId }
      });

      return res.status(200).json({
        message: "Added to watchlist",
        action: "added"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle watchlist" });
  }
};

module.exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        // Import User model if not already at top of file
        const User = require('../../models/user'); 
        
        // Fetch safe public details only
        const user = await User.findById(id).select('username email _id');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};