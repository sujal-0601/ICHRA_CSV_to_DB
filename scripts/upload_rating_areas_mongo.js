// upload_rating_areas_mongo.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

// --- Connection Details ---
const mongoUrl = "mongodb://localhost:27017/plan_db"; // Your MongoDB connection string
const dbName = "plan_db"; // Your database name
const collectionName = "ratingareas"; // The collection for rating areas

// --- File Paths ---
const ratingAreasCsvPath = path.resolve(
  __dirname,
  "../csv_files/rating_areas.csv"
);

// Helper function to read a CSV file into an array in memory
function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

async function uploadRatingAreas() {
  const client = new MongoClient(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 1. Read the entire CSV file into an array.
    console.log("Reading rating_areas.csv into memory...");
    const fileData = await readCsvFile(ratingAreasCsvPath);
    console.log(`Found ${fileData.length} rows in the CSV file.`);

    // 2. Transform the data to match the model schema.
    const ratingAreasToInsert = fileData
      .map((row) => {
        if (!row.id || !row.state_id) {
          console.warn("Skipping row due to missing id or state_id:", row);
          return null; // This will be filtered out.
        }
        // Map the 'id' column from CSV to the 'rating_area_id' field in the model
        return {
          rating_area_id: row.id,
          state_id: row.state_id,
        };
      })
      .filter((doc) => doc !== null); // Remove any null entries from skipped rows

    // 3. Clear existing data and insert the new data.
    if (ratingAreasToInsert.length > 0) {
      await collection.deleteMany({});
      console.log(`Cleared existing data from "${collectionName}" collection.`);

      const result = await collection.insertMany(ratingAreasToInsert);
      console.log(
        `${result.insertedCount} documents were successfully inserted.`
      );
    } else {
      console.log("No valid documents were prepared for insertion.");
    }
  } catch (err) {
    console.error("An error occurred during the upload process:", err);
  } finally {
    // 4. Close the database connection
    if (client && client.topology && client.topology.isConnected()) {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  }
}

uploadRatingAreas();
