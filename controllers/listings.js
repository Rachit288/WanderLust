const { getCollection } = require("../db.js");
const booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const axios = require('axios');
const mapToken = process.env.MAP_TOKEN;

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", { allListings });
}

module.exports.renderNewFrom = (req, res) => {
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            },
        })
        .populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    
    const bookings = await booking.find({listing: listing._id});
    const bookedDates = bookings.map(booking => {
        return {
            from: booking.startDate.toISOString().split("T")[0],
            to: booking.endDate.toISOString().split("T")[0]
        };
    });

    res.render("listings/show.ejs", { listing, mapToken, bookedDates });
}

module.exports.createListing = async (req, res, next) => {
    const mapUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(req.body.listing.location)}.json?key=${mapToken}`;
    const response = await axios.get(mapUrl);


    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    newListing.geometry = response.data.features[0].geometry;
    let savedListing = await newListing.save();
    console.log(savedListing);
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}

module.exports.showSuggestions = async (req, res) => {
    const collection = getCollection();
    const query = req.query.q || "";

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
                        },
                        {
                            'autocomplete': {
                                query,
                                'path': 'title',
                                'tokenOrder': 'any',
                                'fuzzy': {
                                    'maxEdits': 2,
                                    'prefixLength': 1,
                                    'maxExpansions': 256
                                }
                            }
                        },
                    ]
                }
            },
        }, {
            '$limit': 4
        }, {
            '$project': {
                '_id': 0,
                'title': 1,
                'location': 1,
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

        res.render("listings/searchResults.ejs", { results, query, coord });
    } catch (err) {
        console.error("❌ Aggregation error:", err);
        res.status(500).json({ error: "Search failed" });
    }
}

module.exports.listByCategory = async (req, res) => {
    const { category } = req.params;
    const listings = await Listing.find({ category });

    res.render("listings/category.ejs", { listings, category });
}