const express = require("express");
const wrapAsync = require("../../utils/wrapAsync");
const router = express.Router();
const apiUserController = require("../../controllers/api/users");
const passport = require("passport");
const { isLoggedIn } = require("../../middleware");

router.post("/signup", wrapAsync(apiUserController.signup));

router.post("/login", passport.authenticate("local"), apiUserController.login);

router.get("/logout", apiUserController.logout);

router.get("/bookings", isLoggedIn, apiUserController.getMyBookings);

router.get("/listings", isLoggedIn, apiUserController.getMyListings);

router.get("/watchlist", isLoggedIn, apiUserController.getWatchlist);

router.get("/recommendations", isLoggedIn, apiUserController.getAIRecommendations);

router.get("/me", apiUserController.getCurrentUser);

router.post("/history", isLoggedIn, wrapAsync(apiUserController.addToHistory));

router.post("/watchlist", isLoggedIn, wrapAsync(apiUserController.toggleWatchlist));

router.get("/:id", apiUserController.getUserById);

module.exports = router;