// upload_service_areas_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const ServiceArea = require('./models/serviceAreaModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/your_database_name"; // <-- IMPORTANT: Update this
const dbName = "your_database_name"; // <-- IMPORTANT: Update this
const collectionName = "serviceareas";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "service_areas.csv");

async function uploadServiceAreas() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Clear the collection before inserting new data to avoid duplicates on re-runs.
    await collection.deleteMany({});
    console.log(`Cleared existing data from "${collectionName}" collection.`);

    const areasToInsert = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Map the CSV row to the ServiceArea model structure
        const serviceArea = {
          _id: row.id, // Use the CSV 'id' as the MongoDB '_id'
          issuer_id: parseInt(row.issuer_id, 10),
          name: row.name,
        };
        areasToInsert.push(serviceArea);
      })
      .on("end", async () => {
        if (areasToInsert.length > 0) {
          const result = await collection.insertMany(areasToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No documents to insert.");
        }
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from service_areas.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadServiceAreas();
