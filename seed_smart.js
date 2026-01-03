const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Listing = require("./models/listing");
const User = require("./models/user");
require("dotenv").config();

const MONGO_URL = process.env.ATLASDB_URL;
const CSV_PATH = "data/cleaned_listings.csv";

const CATEGORIES = [
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

const IMAGE_URLS = [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470", // Hills
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750", // White House
    "https://images.unsplash.com/photo-1664806453053-17e7a2c9afc6", // Japanese
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739", // Cabin
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6", // Modern Villa
    "https://images.unsplash.com/photo-1513694203232-719a280e022f", // Dining Room
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae", // Kitchen
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233", // Forest
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1", // Swiss View
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688", // Loft
    "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310", // Castle
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e", // Lake
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2", // Beach
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511", // Colorful Home
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"   // Luxury Interior
];

const getVisuals = () => {
    // Shuffle the array simply
    const shuffled = IMAGE_URLS.sort(() => 0.5 - Math.random());

    // Pick the first 3 (so they are always different from each other)
    return {
        main: shuffled[0],
        gallery: [shuffled[1], shuffled[2]]
    };
};

const getRandomCategory = () => {
    const randomIndex = Math.floor(Math.random() * CATEGORIES.length);
    return CATEGORIES[randomIndex]; // Return STRING, not Array
};

// Safe JSON parser for amenities string
const safeParseList = (str) => {
    try {
        // Replace single quotes with double quotes for valid JSON if needed
        const cleanStr = str.replace(/'/g, '"'); 
        return JSON.parse(cleanStr);
    } catch (e) {
        // Fallback: simple text parsing if JSON fails
        return str.replace(/[\[\]']/g, "").split(",").map(s => s.trim()).filter(s => s);
    }
};

async function seedDB() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to DB");

        // --- OPTIONAL: CLEAR OLD DATA ---
        // Uncomment these lines ONLY if you want to wipe the DB and start fresh.
        // await Listing.deleteMany({});
        // await User.deleteMany({});
        // console.log("🗑️ Cleared old data");
        // --------------------------------

        // 1. CREATE 3 DUMMY USERS (if they don't exist)
        const owners = [];
        const usernames = ['owner1', 'owner2', 'owner3'];

        console.log("Checking for users...");
        for (const username of usernames) {
            let user = await User.findOne({ username });
            if (!user) {
                const newUser = new User({ email: `${username}@gmail.com`, username });
                // Assuming passport-local-mongoose is used
                user = await User.register(newUser, "password123"); 
                console.log(`Created user: ${username}`);
            }
            owners.push(user._id);
        }
        console.log(`✅ Users ready: ${owners.length}`);

        // Check if DB is already populated
        const existingCount = await Listing.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️ Database already has ${existingCount} listings.`);
            console.log("   If you want to re-seed, uncomment the deleteMany lines in the code.");
            mongoose.connection.close();
            return;
        }

        // 2. READ CSV & INSERT LISTINGS
        const listings = [];
        let counter = 0;

        console.log(`📖 Reading ${CSV_PATH}...`);

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (data) => {
                // A. Assign Owner (Round Robin)
                const ownerIndex = counter % 3;
                const assignedOwner = owners[ownerIndex];

                // B. Parse Coordinates
                const lat = parseFloat(data.latitude);
                const long = parseFloat(data.longitude);
                const coordinates = (!isNaN(lat) && !isNaN(long))
                    ? [long, lat]
                    : [-73.935242, 40.730610]; // Default NYC

                // C. Visuals
                const visuals = getVisuals();
                const imgParams = "?auto=format&fit=crop&w=800&q=80";

                listings.push({
                    title: data.name || "Untitled Listing",
                    description: data.description || "",
                    price: parseFloat(data.price) || 100,
                    location: data.neighbourhood_cleansed || "Unknown City",
                    country: "USA",

                    image: {
                        url: visuals.main + imgParams,
                        filename: "unsplash_main"
                    },
                    gallery: [
                        { url: visuals.gallery[0] + imgParams, filename: "gallery_1" },
                        { url: visuals.gallery[1] + imgParams, filename: "gallery_2" }
                    ],

                    geometry: {
                        type: 'Point',
                        coordinates: coordinates
                    },

                    category: getRandomCategory(), // Fixed: returns String now

                    // D. Parse new fields
                    amenities: safeParseList(data.amenities || "[]"),
                    maxGuests: parseInt(data.accommodates) || 2,
                    
                    // New Reviews Data
                    averageRating: parseFloat(data.review_scores_rating) || 0,
                    totalReviews: parseInt(data.number_of_reviews) || 0,

                    owner: assignedOwner,
                    text_for_ai: data.text_for_ai
                });

                counter++;
            })
            .on('end', async () => {
                console.log(`Parsed ${listings.length} listings.`);
                
                if (listings.length > 0) {
                    // Insert in batches of 1000 to prevent timeouts
                    const batchSize = 1000;
                    for (let i = 0; i < listings.length; i += batchSize) {
                        const batch = listings.slice(i, i + batchSize);
                        await Listing.insertMany(batch);
                        console.log(`   Inserted batch ${i} to ${i + batch.length}`);
                    }
                    console.log(`🎉 Successfully inserted ${listings.length} listings!`);
                }
                mongoose.connection.close();
            });

    } catch (err) {
        console.error("❌ Seeding Error:", err);
        mongoose.connection.close();
    }
}

seedDB();