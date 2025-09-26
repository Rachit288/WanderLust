const { MongoClient } = require("mongodb");

const dbUrl = process.env.ATLASDB_URL;
const client = new MongoClient(dbUrl);

let collection;

async function initDB() {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("test");
    collection = db.collection("listings");
}

function getCollection() {
    if(!collection) throw new Error("DB not initliased");
    return collection;
}

module.exports = {initDB, getCollection};