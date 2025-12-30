const Notification = require('../../models/notification');

// --- Helper: Bucket Mapping ---
const NOTIFICATION_BUCKETS = {
    transactional: [
        "BOOKING_REQUEST", "BOOKING_CONFIRMED", "PAYMENT_RECEIVED",
        "CANCELLED", "REMINDER", "UNFINISHED_BOOKING"
    ],
    social: [
        "NEW_MESSAGE", "NEW_REVIEW", "REVIEW_REQUEST"
    ],
    discovery: [
        "WISHLIST_ALERT", "PRICE_DROP", "AI_RECOMMENDATION", "AVAILABILITY_ALERT"
    ]
};

// 1. Fetch Notifications (The Feed)
module.exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, filter = 'all', bucket } = req.query;
        const skip = (page - 1) * limit;

        // Base Query: Only show notifications for the logged-in user
        let query = { recipient: req.user._id };

        // A. Filter by Status (Read/Unread)
        if (filter === 'unread') {
            query.isRead = false;
        }

        // B. Filter by Bucket (Transactional, Social, etc.)
        if (bucket && NOTIFICATION_BUCKETS[bucket]) {
            query.type = { $in: NOTIFICATION_BUCKETS[bucket] };
        }

        // Execute Query
        // We populate relatedId based on relatedModel to show context (e.g., Listing Image)
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(parseInt(limit))
            .populate('sender', 'username avatar') // Show who sent it
            .populate({
                path: 'relatedId',
                select: 'title image status startDate endDate' // Fields needed for UI cards
            });

        const totalCount = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

        res.status(200).json({
            notifications,
            meta: {
                total: totalCount,
                unreadTotal: unreadCount,
                page: parseInt(page),
                pages: Math.ceil(totalCount / limit)
            }
        });

    } catch (err) {
        console.error("Fetch Notifications Error:", err);
        res.status(500).json({ message: "Failed to load notifications" });
    }
};

// 2. Fetch Unread Count (For the Red Dot Badge)
module.exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (err) {
        console.error("Count Error:", err);
        res.status(500).json({ message: "Failed to count notifications" });
    }
};

// 3. Mark Single as Read
module.exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id }, // Ensure ownership
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Marked as read", notification });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: "Update failed" });
    }
};

// 4. Mark ALL as Read
module.exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error("Bulk Update Error:", err);
        res.status(500).json({ message: "Bulk update failed" });
    }
};

// 5. Delete Notification
module.exports.deleteNotification = async (req, res) => {
    try {
        await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });
        res.json({ message: "Notification removed" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ message: "Delete failed" });
    }
};