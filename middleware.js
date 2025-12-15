const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, bookingSchema } = require("./schema.js");
const { reviewSchema } = require("./schema.js");

// --- HELPER TO DETECT API REQUESTS ---
const isApiRequest = (req) => {
    return req.originalUrl.startsWith("/api") || req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
};

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (isApiRequest(req)) {
            return res.status(401).json({ message: "You must be logged in to perform this action" });
        }

        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to do the desired action");
        return res.redirect("/login");
    }
    next();
}

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        if (isApiRequest(req)) {
            return res.status(404).json({ message: "Listing not found" });
        }
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    if (!listing.owner._id.equals(res.locals.currUser._id)) {

        if (isApiRequest(req)) {
            return res.status(403).json({ message: "You do not have permission to edit this listing" });
        }

        req.flash("error", "You are not the owner of this listing");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");

        if (isApiRequest(req)) {
            return res.status(400).json({ message: "Validation Error", error: errMsg });
        }

        throw new ExpressError(400, error);
    } else {
        next();
    }
}

module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");

        if (isApiRequest(req)) {
            return res.status(400).json({ message: "Validation Error", error: errMsg });
        }

        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.isReviewAuthor = async (req, res, next) => {
    let { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);

    if (!review) {
        if (isApiRequest(req)) {
            return res.status(404).json({ meesage: "Review not found" });
        }
        req.flash("error", "Review not found");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.author.equals(res.locals.currUser._id)) {
        if (isApiRequest(req)) {
            return res.status(403).json({ message: "You are not the author of this review" });
        }

        req.flash("error", "You are not the author of this review");
        return res.redirect(`/listings/${id}`);
    }

    next();
}

module.exports.validateBooking = (req, res, next) => {
    let { error } = bookingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        
        if (isApiRequest(req)) {
            return res.status(400).json({ message: "Validation Error", error: errMsg });
        }
        
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
}