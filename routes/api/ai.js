const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/api/ai');
// Optional: Add auth middleware if you want only logged-in users to chat
// const { isLoggedIn } = require('../middleware');

// Route: POST /api/v1/ai/chat
router.post('/chat', aiController.chat);

module.exports = router;