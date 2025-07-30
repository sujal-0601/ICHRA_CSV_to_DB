// upload_issuers_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // <-- IMPORTANT: Update this
const dbName = "plan_db"; // <-- IMPORTANT: Update this
const collectionName = "issuers";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/issuers.csv");

async function uploadIssuers() {
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
    console.log('Cleared existing data from "issuers" collection.');

    const issuersToInsert = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const issuer = {
          issuer_id: parseInt(row.id, 10),
          name: row.name,
          alternate_name: row.alternate_name,
          logo_path: row.logo_path,
        };
        issuersToInsert.push(issuer);
      })
      .on("end", async () => {
        if (issuersToInsert.length > 0) {
          const result = await collection.insertMany(issuersToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No documents to insert.");
        }
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from issuers.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadIssuers();
