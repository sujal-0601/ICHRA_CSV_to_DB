// upload_states_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const State = require('./models/stateModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/"; // <-- IMPORTANT: Update this
const dbName = "ichra-local"
const collectionName = "states";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/counties.csv");

// A simple map to convert state abbreviations to full names.
// You can expand this list if your data includes more states.
const stateNames = {
  OR: "Oregon",
};

async function uploadStates() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Use a Set to automatically handle uniqueness of state IDs.
    const uniqueStateIds = new Set();

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === "string") {
            row[key] = row[key].trim();
          }
        });
        if (row.state_id) {
          uniqueStateIds.add(row.state_id);
        }
      })
      .on("end", async () => {
        const statesToInsert = [];
        for (const stateId of uniqueStateIds) {
          statesToInsert.push({
            _id: stateId, // e.g., 'OR'
            name: stateNames[stateId] || stateId, // e.g., 'Oregon' or 'OR' if not in map
          });
        }

        if (statesToInsert.length > 0) {
          await collection.deleteMany({});
          console.log(
            `Cleared existing data from "${collectionName}" collection.`
          );

          const result = await collection.insertMany(statesToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No states found to insert.");
        }

        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished creating state data.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadStates();
