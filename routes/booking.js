const express = require("express");
const { isLoggedIn } = require("../middleware");
const Listing = require("../models/listing");
const booking = require("../models/booking");
const router = express.Router();

router.post("/:id", isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const [startDate, endDate] = req.body.range.split("to");

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    const overlappingBooking = await booking.findOne({
        listing: id,
        $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
    })

    if (overlappingBooking) {
        req.flash("error", "These dates are already booked");
        return res.redirect(`/listings/${id}`);
    }

    console.log("req user", req.user);

    console.log("Creating booking:", {
        listing: id,
        user: req.user._id,
        startDate,
        endDate
    });

    const newBooking = new booking({
        listing: id,
        user: req.user._id,
        startDate,
        endDate
    });

    await newBooking.save();

    req.flash("success", "Booking successful");
    res.redirect(`/listings/${id}`);
})

module.exports = router;