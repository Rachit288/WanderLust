const express = require("express");
const router = express.Router();
const apiChatController = require("../../controllers/api/chat");
const { isLoggedIn } = require("../../middleware");
const wrapAsync = require("../../utils/wrapAsync");

router.get("/conversations", isLoggedIn, wrapAsync(apiChatController.getConversations));

router.get("/:userId", isLoggedIn, wrapAsync(apiChatController.getChatHistory));

module.exports = router;