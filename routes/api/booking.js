const express = require("express");
const router = express.Router({ mergeParams: true });
const apiBookingController = require("../../controllers/api/bookings");
const { isLoggedIn, validateBooking } = require("../../middleware");
const wrapAsync = require("../../utils/wrapAsync");

router.post("/:id", isLoggedIn, validateBooking, wrapAsync(apiBookingController.createBooking));

router.get("/:id", wrapAsync(apiBookingController.getBookingsForListing));

module.exports = router;