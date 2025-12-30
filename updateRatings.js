const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Listing = require("./models/listing"); // Adjust path if needed
require("dotenv").config();

// CONFIGURATION
const CSV_FILE_PATH = './data/listings.csv'; // Path to your file
const MONGO_URL = process.env.ATLASDB_URL; // PASTE YOUR ATLAS URL HERE

async function migrate() {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to DB");

    const results = [];

    // 1. Read CSV
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            console.log(`📂 Found ${results.length} rows in CSV.`);
            
            let updatedCount = 0;

            // 2. Iterate and Update
            for (const row of results) {
                const title = row.name; // 'name' in CSV maps to 'title' in DB
                const rating = parseFloat(row.review_scores_rating) || 0;
                
                // You preferred 'number_of_reviews' for total count logic
                const total = parseInt(row.number_of_reviews) || 0; 

                if (title) {
                    // Find listing by Title
                    const listing = await Listing.findOne({ title: title });
                    
                    if (listing) {
                        listing.averageRating = rating;
                        listing.totalReviews = total;
                        await listing.save();
                        updatedCount++;
                        if (updatedCount % 100 === 0) process.stdout.write(".");
                    }
                }
            }

            console.log(`\n✅ Migration Complete! Updated ${updatedCount} listings.`);
            mongoose.connection.close();
        });
}

migrate();