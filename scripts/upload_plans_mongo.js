// upload_plans_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/"; // <-- IMPORTANT: Update this
const dbName = "ichra-local"; // <-- IMPORTANT: Update this
const collectionName = "plans";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/plans.csv");

// Helper to convert 'true'/'false' strings to boolean
const toBoolean = (value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return !!value;
};

async function uploadPlans() {
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
    console.log('Cleared existing data from "plans" collection.');

    const plansToInsert = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Map CSV row to the Plan model structure
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === "string") {
            row[key] = row[key].trim();
          }
        });
        const plan = {
          plan_id: row.id, // Use the existing plan ID as the primary key
          name: row.name,
          issuer_id: row.hios_issuer_id,
          service_area_id: row.service_area_id,
          level: row.level,
          plan_type: row.plan_type,
          on_market: toBoolean(row.on_market),
          off_market: toBoolean(row.off_market),
          hsa_eligible: toBoolean(row.hsa_eligible),
          effective_date: new Date(row.effective_date),
          expiration_date: new Date(row.expiration_date),
          
        };
        plansToInsert.push(plan);
      })
      .on("end", async () => {
        if (plansToInsert.length > 0) {
          const result = await collection.insertMany(plansToInsert);
          console.log(`${result.insertedCount} documents were inserted.`);
        } else {
          console.log("No documents to insert.");
        }
        await client.close();
        console.log("MongoDB connection closed.");
        console.log("Finished uploading data from plans.csv.");
      });
  } catch (err) {
    console.error("An error occurred:", err);
    await client.close();
  }
}

uploadPlans();
