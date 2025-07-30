// upload_counties_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db";
const dbName = "plan_db";
const collectionName = "counties";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/counties.csv");

async function uploadCounties() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Optional: Clear existing data
    await collection.deleteMany({});
    console.log('Cleared existing data from "counties" collection.');

    const countiesToInsert = [];

    // Read and parse the CSV file
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Create a new document, mapping only the fields defined in your countyModel.js
        // Extra fields like 'rating_area_count' and 'service_area_count' are ignored.
        const county = {
          county_id: row.id, // Use CSV id as MongoDB _id
          name: row.name,
          state_id: row.state_id,
        };
        countiesToInsert.push(county);
      })
      .on("end", async () => {
        // Insert all the documents in a single batch
        if (countiesToInsert.length > 0) {
          const result = await collection.insertMany(countiesToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No documents to insert.");
        }

        // Close the connection
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from counties.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadCounties();
