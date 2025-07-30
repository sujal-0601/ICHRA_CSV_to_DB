// upload_plan_counties_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // <-- IMPORTANT: Update this
const dbName = "plan_db"; // <-- IMPORTANT: Update this
const collectionName = "plancounties";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/plan_counties.csv");

async function uploadPlanCounties() {
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
    console.log('Cleared existing data from "plancounties" collection.');

    const dataToInsert = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const planCounty = {
          plan_id: row.plan_id,
          county_id: parseInt(row.county_id, 10),
        };
        dataToInsert.push(planCounty);
      })
      .on("end", async () => {
        if (dataToInsert.length > 0) {
          // This creates a compound index to prevent duplicates
          await collection.createIndex(
            { plan_id: 1, county_id: 1 },
            { unique: true }
          );

          // Using bulk write with upsert to handle potential duplicates gracefully
          const bulkOps = dataToInsert.map((doc) => ({
            updateOne: {
              filter: { plan_id: doc.plan_id, county_id: doc.county_id },
              update: { $set: doc },
              upsert: true,
            },
          }));

          const result = await collection.bulkWrite(bulkOps);
          console.log(
            `${result.upsertedCount} documents were inserted/updated.`
          );
        } else {
          console.log("No documents to insert.");
        }
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from plan_counties.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadPlanCounties();
