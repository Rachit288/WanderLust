const mongoose = require("mongoose");
const Listing = require("./models/listing");
require("dotenv").config();

mongoose.connect(process.env.ATLASDB_URL);

async function migrate() {
    const result = await Listing.updateMany(
        { category: { $type: "array" } },
        [{ $set: { category: { $arrayElemAt: ["$category", 0] } } }]
    );

    console.log(`Modified ${result.modifiedCount} listings`);
    mongoose.connection.close();
}

migrate();
