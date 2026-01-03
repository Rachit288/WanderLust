const Listing = require("../../models/listing.js");
const Notification = require("../../models/notification.js");
const Booking = require("../../models/booking.js");
const User = require("../../models/user.js");
const axios = require('axios');
const { getEmbedding, getRecommendations } = require("../../utils/aiService");
const { getCollection } = require("../../db.js");

const mapToken = process.env.MAP_TOKEN;

module.exports.getCollections = async (req, res) => {
    try {
        const targetCategories = [
            "Architectural Gems",
            "Private Islands",
            "Urban Lofts",
            "Forest Retreats",
            "Historic Castles",
            "Alpine Chalets",
            "Desert Oases",
            "Vineyard Estates",
            "Cliffside Havens",
            "Modern Glasshouses"
        ];

        const stats = await Listing.aggregate([
            { $match: { category: { $in: targetCategories } } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        // Transform into a cleaner object
        // e.g., { "Mountains": 12, "Castles": 5 }
        const counts = {};
        stats.forEach(item => {
            counts[item._id] = item.count;
        });

        res.status(200).json(counts);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch collection stats" });
    }
}

module.exports.index = async (req, res) => {
    try {
        const { category, page = 1, limit = 12 } = req.query;

        let query = {};
        if (category) {
            query.category = category; // Filter by category
        }

        const pageInt = parseInt(page);
        const limitInt = parseFloat(limit);
        const skip = (pageInt - 1) * limitInt;

        const [listings, totalCount] = await Promise.all([
            Listing.find(query)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limitInt),
            Listing.countDocuments(query)
        ]);

        res.json({
            listings,
            meta: {
                total: totalCount,
                page: pageInt,
                pages: Math.ceil(totalCount / limitInt),
                hasMore: skip + listings.length < totalCount
            }
        });
    } catch (error) {
        console.error("Listing Fetch Error:", err);
        res.status(500).json({ message: "Failed to fetch listings" });
    }
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
    }

    // --- AI INTEGRATION: Get Recommendations ---
    let recommendations = [];
    try {
        recommendations = await getRecommendations(id, req.user._id);
    } catch (err) {
        console.log("AI Service offline, skipping recommendations");
    }
    // ------------------------------------------

    res.status(200).json({ listing, recommendations });
};

module.exports.createListing = async (req, res) => {
    try {
        const listingData = req.body.listing;

        // 1. Handle Geocoding
        const mapUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(listingData.location)}.json?key=${mapToken}`;
        const mapResponse = await axios.get(mapUrl);

        if (Array.isArray(listingData.category)) {
            listingData.category = listingData.category[0];
        }

        // 2. Initialize Listing Object
        const newListing = new Listing(listingData);
        newListing.owner = req.user._id;
        newListing.geometry = mapResponse.data.features[0].geometry;

        // 3. Handle Files (Multer)
        // Main Image (Required)
        if (req.files && req.files['listing[image]']) {
            const file = req.files['listing[image]'][0];
            newListing.image = { url: file.path, filename: file.filename };
        }

        // Gallery Images (Optional)
        if (req.files && req.files['listing[gallery]']) {
            newListing.gallery = req.files['listing[gallery]'].map(file => ({
                url: file.path,
                filename: file.filename
            }));
        }

        // 4. --- AI INTEGRATION ---
        // Format array fields for the text blob
        const amenitiesStr = Array.isArray(listingData.amenities)
            ? listingData.amenities.join(", ")
            : listingData.amenities || "";


        const textForAI = `
            Title: ${newListing.title}
            Category: ${newListing.category}
            Location: ${newListing.location}, ${newListing.country}
            Description: ${newListing.description}
            Amenities: ${amenitiesStr}
            Max Guests: ${newListing.maxGuests}
            Price: ${newListing.price}
        `.trim();

        newListing.text_for_ai = textForAI;

        // Generate Vector
        const vector = await getEmbedding(textForAI);
        if (vector && vector.length > 0) {
            newListing.embedding = vector;
        }
        // -------------------------

        await newListing.save();
        res.status(201).json(newListing);

    } catch (err) {
        console.error("Create Error:", err);
        res.status(500).json({ message: "Failed to create listing", error: err.message });
    }
};

module.exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body.listing;

        if (Array.isArray(updateData.category)) {
            updateData.category = updateData.category[0];
        }

        const oldListing = await Listing.findById(id);

        // 1. Find and Update Basic Fields
        let listing = await Listing.findByIdAndUpdate(id, { ...updateData }, { new: true });

        if (!listing) return res.status(404).json({ message: "Listing not found" });

        // 2. Handle Files
        // Update Main Image (Replace old)
        if (req.files && req.files['listing[image]']) {
            const file = req.files['listing[image]'][0];
            listing.image = { url: file.path, filename: file.filename };
        }

        // Update Gallery (Append new images to existing)
        if (req.files && req.files['listing[gallery]']) {
            const newGalleryImages = req.files['listing[gallery]'].map(file => ({
                url: file.path,
                filename: file.filename
            }));
            listing.gallery.push(...newGalleryImages);
        }

        // 3. --- RE-CALCULATE AI VECTOR ---
        // Since description, amenities, or category might have changed, we must update the vector.
        const amenitiesStr = Array.isArray(listing.amenities)
            ? listing.amenities.join(", ")
            : listing.amenities || "";

        const categoryStr = Array.isArray(listing.category)
            ? listing.category.join(", ")
            : listing.category || "";

        const textForAI = `
            Title: ${listing.title}
            Category: ${categoryStr}
            Location: ${listing.location}, ${listing.country}
            Description: ${listing.description}
            Amenities: ${amenitiesStr}
            Max Guests: ${listing.maxGuests}
            Price: ${listing.price}
        `.trim();

        listing.text_for_ai = textForAI;

        const vector = await getEmbedding(textForAI);
        if (vector && vector.length > 0) {
            listing.embedding = vector;
        }
        // ---------------------------------

        // --- 3. SMART NOTIFICATION: PRICE DROP ---
        // Check if price dropped by at least 10% (avoid spamming for small changes)
        if (oldListing.price > 0 && listing.price < oldListing.price) {
            const dropPercentage = ((oldListing.price - listing.price) / oldListing.price) * 100;

            if (dropPercentage >= 10) {
                const watchers = await User.find({ watchlist: id });

                for (let watcher of watchers) {
                    const notif = await Notification.create({
                        recipient: watcher._id,
                        type: "PRICE_DROP",
                        message: `Price Drop Alert! Price of ${listing.title} has dropped ${Math.round(dropPercentage)}%.`,
                        relatedId: listing._id,
                        relatedModel: "Listing"
                    });

                    if (req.io) {
                        req.io.to(watcher._id.toString()).emit("new_notification", notif);
                    }
                }
                console.log(`Sent Price Drop Alert to ${watchers.length} watchers.`);
            }
        }

        await listing.save();
        res.status(200).json(listing);

    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: "Failed to update listing", error: err.message });
    }
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.status(200).json({ message: "Listing deleted successfully" });
};

module.exports.showSuggestions = async (req, res) => {
    const collection = getCollection();
    const query = req.query.location || "";

    if (!query || !query.trim()) {
        return res.json([]);
    }

    const pipeline = [
        {
            '$search': {
                'index': 'default',
                'compound': {
                    'should': [
                        {
                            'autocomplete': {
                                query,
                                'path': 'location',
                                'tokenOrder': 'any',
                                'fuzzy': {
                                    'maxEdits': 2,
                                    'prefixLength': 1,
                                    'maxExpansions': 256
                                }
                            }
                        }
                    ]
                }
            },
        }, {
            '$limit': 5
        }, {
            '$project': {
                _id: 0,
                place_name: "$location"
            }
        }

    ];

    try {
        const results = await collection.aggregate(pipeline).toArray();
        res.json(results);
    } catch (err) {
        console.error("❌ Suggestion error:", err);
        res.status(500).json({ error: "Failed to fetch suggestions" });
    }
}

module.exports.searchResults = async (req, res) => {
    const collection = getCollection();
    const query = req.query.q || "";
    const mapUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${mapToken}`;
    const response = await axios.get(mapUrl);
    const coord = response.data.features[0].geometry;

    const agg = [
        {
            '$search': {
                'index': 'default',
                'compound': {
                    'should': [
                        {
                            'autocomplete': {
                                'path': 'location',
                                query,
                                'tokenOrder': 'any',
                                'fuzzy': {
                                    'maxEdits': 1,
                                    'prefixLength': 1,
                                    'maxExpansions': 256
                                }
                            }
                        },
                        {
                            'autocomplete': {
                                'path': 'title',
                                query,
                                'tokenOrder': 'any',
                                'fuzzy': {
                                    'maxEdits': 1,
                                    'prefixLength': 1,
                                    'maxExpansions': 256
                                }
                            }
                        },
                        {
                            'text': {
                                'path': ['description', 'location', 'title', 'country'],
                                query,
                                'fuzzy': {
                                    'maxEdits': 1,
                                    'prefixLength': 1,
                                    'maxExpansions': 256
                                }
                            }
                        },

                    ],
                    'filter': [
                        {
                            'geoWithin': {
                                'circle': {
                                    'center': coord,
                                    'radius': 10000,
                                },
                                'path': "geometry"
                            }
                        }
                    ]
                },
                'highlight': {
                    'path': ['description', 'country', 'location', 'title']
                }
            }
        }, {
            '$limit': 10
        }, {
            '$project': {
                '_id': 1,
                'title': 1,
                'description': 1,
                'price': { '$convert': { 'input': "$price", 'to': "double" } },
                'location': 1,
                'geometry': {
                    'coordinates': 1
                },
                'image': {
                    'url': 1
                },
                'highlights': {
                    '$meta': 'searchHighlights'
                }
            }
        }
    ];
    try {
        const results = await collection.aggregate(agg).toArray();
        res.json({ results, coord });
    } catch (err) {
        console.error("❌ Aggregation error:", err);
        res.status(500).json({ error: "Search failed" });
    }
}

module.exports.searchListings = async (req, res) => {
    try {
        const { location, checkIn, checkOut } = req.query;

        if (!location) {
            return res.status(400).json({ message: "Location is required" });
        }

        const geoUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(location)}.json?key=${mapToken}`;
        const geoRes = await axios.get(geoUrl);

        const feature = geoRes.data.features?.[0];
        if (!feature) return res.json({ results: [], searchCenter: null });

        const searchCenter = feature.geometry;

        let unavailableListingIds = [];

        if (checkIn && checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);

            // Find all CONFIRMED bookings that overlap with the requested range
            // Logic: (RequestStart < BookingEnd) AND (RequestEnd > BookingStart)
            const clashingBookings = await Booking.find({
                status: 'confirmed',
                $or: [
                    {
                        startDate: { $lt: end },
                        endDate: { $gt: start }
                    }
                ]
            }).select('listing');

            unavailableListingIds = clashingBookings.map(b => b.listing);
        }

        const pipeline = [
            {
                $search: {
                    index: "default",
                    compound: {
                        must: [
                            {
                                geoWithin: {
                                    circle: {
                                        center: searchCenter,
                                        radius: 15000
                                    },
                                    path: "geometry"
                                }
                            }
                        ],
                        should: [
                            {
                                autocomplete: {
                                    path: "location",
                                    query: location,
                                    tokenOrder: "any",
                                    fuzzy: { maxEdits: 1 }
                                }
                            },
                            {
                                text: {
                                    path: ["title", "description", "country"],
                                    query: location
                                }
                            }
                        ]
                    }
                }
            },

            // ✅ EXCLUDE BOOKED LISTINGS HERE
            ...(unavailableListingIds.length
                ? [{
                    $match: {
                        _id: { $nin: unavailableListingIds }
                    }
                }]
                : []),

            { $limit: 50 },

            {
                $project: {
                    title: 1,
                    location: 1,
                    price: 1,
                    geometry: 1,
                    image: 1,
                    averageRating: 1,
                    score: { $meta: "searchScore" }
                }
            }
        ];

        const results = await Listing.aggregate(pipeline);

        res.json({ results, searchCenter });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: "Search failed" });
    }
}