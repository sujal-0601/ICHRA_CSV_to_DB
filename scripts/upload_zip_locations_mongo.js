// upload_zip_locations_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const ZipLocation = require('./models/zipLocationModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // <-- IMPORTANT: Update this
const dbName = "plan_db"; // <-- IMPORTANT: Update this
const collectionName = "ziplocations";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/zip_counties.csv");

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
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === "string") {
            row[key] = row[key].trim();
          }
        });
        const zipLocation = {
          county_id: row.county_id,
          zip_code: row.zip_code_id,
          rating_area_id: row.rating_area_id,
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
