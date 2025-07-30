// upload_plan_prices_batched.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // Your MongoDB connection string
const dbName = "plan_db"; // Your database name
const collectionName = "planprices";

// --- File Paths ---
const pricingsCsvPath = path.resolve(__dirname, "../csv_files/pricings.csv");

async function uploadPlanPricesWithBatching() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const BATCH_SIZE = 10000; // Process 10,000 documents at a time. You can adjust this number.
  let batch = [];
  let totalInserted = 0;

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    console.log(`Cleared existing data from "${collectionName}" collection.`);

    console.log("Reading and processing pricings.csv with batching...");
    const stream = fs.createReadStream(pricingsCsvPath);

    // Create a promise to wait for the stream processing to complete
    const streamPromise = new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", async (row) => {
          const plan_id = row.plan_id;
          if (!plan_id) return; // Skip rows without a plan_id

          // Iterate over each column in the row to find age-based prices.
          for (const key in row) {
            if (key.startsWith("age_")) {
              const priceValue = parseFloat(row[key]);
              if (!priceValue) continue; // Skip if there's no valid price.

              const parts = key.split("_");
              const age = parseInt(parts[1], 10);
              const is_tobacco_user =
                parts.length > 2 && parts[2] === "tobacco";

              batch.push({
                plan_id: plan_id,
                age: age,
                is_tobacco_user: is_tobacco_user,
                price: priceValue,
                effective_date: new Date(row.effective_date),
                expiry_date: new Date(row.expiry_date),
              });

              // When the batch is full, insert it into the database
              if (batch.length === BATCH_SIZE) {
                stream.pause(); // Pause the read stream to prevent memory overload
                try {
                  const result = await collection.insertMany(batch, {
                    ordered: false,
                  });
                  totalInserted += result.insertedCount;
                  console.log(
                    `Inserted a batch of ${result.insertedCount} documents. Total: ${totalInserted}`
                  );
                  batch = []; // Clear the batch for the next set of documents
                } catch (dbError) {
                  console.error("Database batch insert error:", dbError);
                }
                stream.resume(); // Resume the read stream
              }
            }
          }
        })
        .on("end", async () => {
          // Insert any remaining documents in the last batch
          if (batch.length > 0) {
            try {
              const result = await collection.insertMany(batch, {
                ordered: false,
              });
              totalInserted += result.insertedCount;
              console.log(
                `Inserted the final batch of ${result.insertedCount} documents. Total: ${totalInserted}`
              );
            } catch (dbError) {
              console.error("Database final batch insert error:", dbError);
            }
          }
          resolve(); // Resolve the promise when the stream ends
        })
        .on("error", (streamError) => {
          reject(streamError); // Reject the promise on a stream error
        });
    });

    await streamPromise; // Wait for the entire process to finish
  } catch (err) {
    console.error("An error occurred during the upload process:", err);
  } finally {
    // Ensure the client connection is closed
    if (client && client.topology && client.topology.isConnected()) {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  }
}

uploadPlanPricesWithBatching();
