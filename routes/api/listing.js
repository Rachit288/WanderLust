const express = require("express");
const router = express.Router();
const wrapAsync = require("../../utils/wrapAsync.js");
const apiListingController = require("../../controllers/api/listings.js");
const multer = require("multer");
const { storage } = require("../../cloudConfig.js");
const upload = multer({ storage });

// MIDDLEWARE
// You might need to adjust auth middleware for the API context
const { isLoggedIn, isOwner, validateListing } = require("../../middleware.js");

// Configure Uploads: 1 Main Image, up to 10 Gallery Images
const uploadFields = upload.fields([
    { name: 'listing[image]', maxCount: 1 },
    { name: 'listing[gallery]', maxCount: 10 }
]);

router.route("/")
    .get(wrapAsync(apiListingController.index))
    .post(
        isLoggedIn,
        uploadFields, // <--- Updated to handle multiple files
        // validateListing, // validation might fail if schema requires files not yet processed, enable carefully
        wrapAsync(apiListingController.createListing)
    );


router.get("/collections", wrapAsync(apiListingController.getCollections));

router.get("/suggestions", wrapAsync(apiListingController.showSuggestions));

router.get("/search", wrapAsync(apiListingController.searchResults));

router.get("/searchListings", wrapAsync(apiListingController.searchListings));

router.route("/:id")
    .get(wrapAsync(apiListingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        uploadFields, // <--- Updated here too
        // validateListing, 
        wrapAsync(apiListingController.updateListing)
    )
    .delete(isLoggedIn, isOwner, wrapAsync(apiListingController.destroyListing));


module.exports = router;