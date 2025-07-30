// upload_service_areas_mongo.js
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Model (for reference) ---
// const ServiceArea = require('./models/serviceAreaModel');

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/"; // <-- IMPORTANT: Update this
const dbName = "ichra-local"
const collectionName = "serviceareas";

// --- File Paths ---
const csvPath = path.resolve(__dirname, "../csv_files/service_areas.csv");

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
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === "string") {
            row[key] = row[key].trim();
          }
        });
        const serviceArea = {
          service_area_id: row.id, // Use the CSV 'id' as the MongoDB '_id'
          issuer_id: row.issuer_id
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
