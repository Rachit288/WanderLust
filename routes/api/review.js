const express = require("express");
const router = express.Router({ mergeParams: true });
const apiReviewController = require("../../controllers/api/reviews");
const { isLoggedIn, validateReview, isReviewAuthor } = require("../../middleware");
const wrapAsync = require("../../utils/wrapAsync");

router.post("/", isLoggedIn, validateReview, wrapAsync(apiReviewController.createReview));

router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(apiReviewController.destroyReview));

module.exports = router;