// upload_plans_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");
const Plan = require("./models/planModel");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // <-- IMPORTANT: Update this
const dbName = "plan_db"; // <-- IMPORTANT: Update this
const collectionName = "plans";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "plans.csv");

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
        const plan = {
          _id: row.id, // Use the existing plan ID as the primary key
          carrier_name: row.carrier_name,
          display_name: row.display_name,
          effective_date: row.effective_date,
          expiration_date: row.expiration_date,
          name: row.name,
          plan_type: row.plan_type,
          service_area_id: row.service_area_id,
          source: row.source,
          type: row.type,
          adult_dental: toBoolean(row.adult_dental),
          age29_rider: toBoolean(row.age29_rider),
          ambulance: row.ambulance,
          benefits_summary_url: row.benefits_summary_url,
          buy_link: row.buy_link,
          child_dental: toBoolean(row.child_dental),
          // ... map all other fields from plans.csv to your schema
          // Ensure to parse numbers and booleans correctly
          hios_issuer_id: parseInt(row.hios_issuer_id, 10),
          hsa_eligible: toBoolean(row.hsa_eligible),
          level: row.level,
          logo_url: row.logo_url,
          on_market: toBoolean(row.on_market),
          off_market: toBoolean(row.off_market),
          out_of_network_coverage: toBoolean(row.out_of_network_coverage),
          plan_market: row.plan_market,
          actuarial_value: parseFloat(row.actuarial_value) || null,
          // ... continue for all fields
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
