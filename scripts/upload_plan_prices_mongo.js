// upload_plan_prices_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const PlanPrice = require('./models/planPriceModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // <-- IMPORTANT: Update this
const dbName = "plan_db"; // <-- IMPORTANT: Update this
const collectionName = "planprices";

// --- File Paths ---
const pricingsCsvPath = path.resolve(__dirname, "../csv_files/pricings.csv");

async function uploadPlanPrices() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // 1. Connect to MongoDB.
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 2. Clear previous data from the collection.
    await collection.deleteMany({});
    console.log(`Cleared existing data from "${collectionName}" collection.`);

    const documentsToInsert = [];

    // 3. Read and process the pricings.csv file.
    console.log("Reading and processing pricings.csv...");
    fs.createReadStream(pricingsCsvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Extract plan_id and dates directly from the row.
        const plan_id = row.plan_id;
        const effective_date = row.effective_date;
        const expiry_date = row.expiry_date;

        if (!plan_id) {
          console.warn("Skipping a row due to missing plan_id.");
          return;
        }

        // Iterate over each column in the row to find age-based prices.
        for (const key in row) {
          // Target columns that start with 'age_'
          if (key.startsWith("age_")) {
            const priceValue = parseFloat(row[key]);

            // Skip if there's no valid price.
            if (!priceValue) {
              continue;
            }

            // Parse age and tobacco status from the column header (e.g., 'age_21_tobacco').
            const parts = key.split("_");
            const age = parseInt(parts[1], 10);
            const is_tobacco_user = parts.length > 2 && parts[2] === "tobacco";

            // Create a new document for each individual price point.
            const priceDocument = {
              plan_id: plan_id,
              age: age,
              is_tobacco_user: is_tobacco_user,
              price: priceValue,
              effective_date: new Date(effective_date),
              expiry_date: new Date(expiry_date),
            };
            documentsToInsert.push(priceDocument);
          }
        }
      })
      .on("end", async () => {
        // 4. Insert the prepared documents into the database.
        if (documentsToInsert.length > 0) {
          console.log(
            `Preparing to insert ${documentsToInsert.length} documents...`
          );
          // Using insertMany is highly efficient for large numbers of documents.
          const result = await collection.insertMany(documentsToInsert, {
            ordered: false,
          });
          console.log(
            `${result.insertedCount} documents were successfully inserted.`
          );
        } else {
          console.log("No documents were prepared for insertion.");
        }

        // 5. Close the database connection.
        await client.close();
        console.log("MongoDB connection closed.");
      });
  } catch (err) {
    console.error("An error occurred during the upload process:", err);
    // Ensure the client is closed on error
    if (client && client.topology && client.topology.isConnected()) {
      await client.close();
    }
  }
}

uploadPlanPrices();
