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
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"  // Luxury Interior
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
    return [CATEGORIES[randomIndex]]; // Return as array since schema expects [String]
};

async function seedDB() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to DB");

        // 1. CLEAR EXISTING DATA (Optional - Use carefully!)
        // await Listing.deleteMany({});
        // await User.deleteMany({});
        // console.log("🗑️ Cleared old data");

        // 2. CREATE 3 DUMMY USERS
        // We use 'register' if you use passport-local-mongoose, 
        // otherwise just new User().save()
        const owners = [];
        const usernames = ['owner1', 'owner2', 'owner3'];

        console.log("Creating users...");
        for (const username of usernames) {
            // Check if exists first
            let user = await User.findOne({ username });
            if (!user) {
                // Create new user (Passport style)
                const newUser = new User({ email: `${username}@gmail.com`, username });
                user = await User.register(newUser, "password123"); // Default password
            }
            owners.push(user._id);
        }
        console.log(`✅ Users ready: ${owners.length}`);

        // 3. READ CSV & INSERT LISTINGS
        const listings = [];
        let counter = 0;

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (data) => {
                // A. Assign Owner (Round Robin: 0, 1, 2, 0, 1, 2...)
                const ownerIndex = counter % 3;
                const assignedOwner = owners[ownerIndex];

                // B. Parse Coordinates (GeoJSON format is [Longitude, Latitude])
                // CSV usually has lat, long columns.
                const lat = parseFloat(data.latitude);
                const long = parseFloat(data.longitude);

                // Fallback if data is bad
                const coordinates = (!isNaN(lat) && !isNaN(long))
                    ? [long, lat]
                    : [-73.935242, 40.730610]; // Default NYC

                // 3. GET RANDOM IMAGES
                const visuals = getVisuals();

                // Add suffix for Unsplash sizing (optional optimization)
                const imgParams = "?auto=format&fit=crop&w=800&q=80";

                listings.push({
                    title: data.name || "Untitled Listing",
                    description: data.description || "",
                    price: parseFloat(data.price) || 100,
                    location: data.neighbourhood_cleansed || "Unknown City",
                    country: "USA",

                    // Main Image
                    image: {
                        url: visuals.main + imgParams,
                        filename: "unsplash_main"
                    },
                    // Dummy Gallery (First image is same as main)
                    gallery: [
                        { url: visuals.gallery[0] + imgParams, filename: "gallery_1" },
                        { url: visuals.gallery[1] + imgParams, filename: "gallery_2" }
                    ],

                    // Correct Geometry from CSV
                    geometry: {
                        type: 'Point',
                        coordinates: coordinates
                    },

                    // Random Category
                    category: getRandomCategory(),

                    // Amenities from CSV (using eval to parse string array)
                    amenities: data.amenities ? eval(data.amenities) : [],

                    // Max Guests from CSV ('accommodates')
                    maxGuests: parseInt(data.accommodates) || 2,

                    // Assign the Owner
                    owner: assignedOwner,

                    // AI Field
                    text_for_ai: data.text_for_ai
                });

                counter++;
            })
            .on('end', async () => {
                console.log(`Parsed ${listings.length} listings. Inserting into MongoDB...`);
                if (listings.length > 0) {
                    await Listing.insertMany(listings);
                    console.log(`🎉 Inserted ${listings.length} listings with random images!`);
                }
                mongoose.connection.close();
            });

    } catch (err) {
        console.error("❌ Seeding Error:", err);
        mongoose.connection.close();
    }
}

seedDB();

