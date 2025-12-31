const express = require("express");
const router = express.Router({ mergeParams: true });
const apiBookingController = require("../../controllers/api/bookings");
const { isLoggedIn, validateBooking } = require("../../middleware");
const wrapAsync = require("../../utils/wrapAsync");

router.post("/initiate/:id", isLoggedIn, wrapAsync(apiBookingController.initiateBooking));

router.post("/confirm", isLoggedIn, wrapAsync(apiBookingController.confirmBooking));

router.get("/:id", wrapAsync(apiBookingController.getBooking));

router.get("/listing/:id", wrapAsync(apiBookingController.getBookingsForListing));

router.put("/:bookingId/cancel", apiBookingController.cancelBooking);

module.exports = router;