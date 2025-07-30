// upload_zip_locations_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const ZipLocation = require('./models/zipLocationModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/your_database_name"; // <-- IMPORTANT: Update this
const dbName = "your_database_name"; // <-- IMPORTANT: Update this
const collectionName = "ziplocations";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "zip_counties.csv");

async function uploadZipLocations() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    console.log(`Cleared existing data from "${collectionName}" collection.`);

    const locationsToInsert = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Map CSV row to the ZipLocation model structure
        const zipLocation = {
          _id: parseInt(row.id, 10), // Use CSV id as MongoDB _id
          rating_area_id: row.rating_area_id,
          county_id: parseInt(row.county_id, 10),
          zip_code_id: parseInt(row.zip_code_id, 10),
        };
        locationsToInsert.push(zipLocation);
      })
      .on("end", async () => {
        if (locationsToInsert.length > 0) {
          const result = await collection.insertMany(locationsToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No documents to insert.");
        }
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from zip_counties.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadZipLocations();
