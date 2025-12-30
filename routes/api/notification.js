const express = require('express');
const router = express.Router();
const notifications = require('../../controllers/api/notifications');
const { isLoggedIn } = require('../../middleware'); // Your auth middleware

// Base Route: /api/v1/notifications

// 1. Get the list (supports ?page=1&bucket=social)
router.get('/', isLoggedIn, notifications.getNotifications);

// 2. Get just the number for the badge
router.get('/unread-count', isLoggedIn, notifications.getUnreadCount);

// 3. Mark all as read (Bulk action)
router.patch('/mark-all-read', isLoggedIn, notifications.markAllAsRead);

// 4. Mark specific one as read
router.patch('/:id/read', isLoggedIn, notifications.markAsRead);

// 5. Delete one
router.delete('/:id', isLoggedIn, notifications.deleteNotification);

module.exports = router;