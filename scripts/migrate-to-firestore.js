const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Resolve path to service account key
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const backupPath = path.join(__dirname, "../firebase-backup-2026-05-06T17-06-30-613Z.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  console.error(`Error: Backup JSON file not found at ${backupPath}`);
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Set settings for Firestore if needed (optional)
db.settings({ ignoreUndefinedProperties: true });

function cleanForFirestore(value) {
  if (value === undefined) return null;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map(cleanForFirestore);
  }

  if (typeof value === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }

  return value;
}

async function migrateCollection(collectionName, sourceData) {
  if (!sourceData) {
    console.log(`Collection ${collectionName} has no data to migrate. Skipping.`);
    return;
  }

  const keys = Object.keys(sourceData);
  console.log(`\nStarting migration for [${collectionName}]: ${keys.length} items...`);

  let batch = db.batch();
  let count = 0;
  let totalMigrated = 0;

  for (const docId of keys) {
    let rawData = sourceData[docId];
    let cleanedData;

    if (collectionName === "loginIdEmails") {
      // Special-case: loginIdEmails keys are LBS-xxxx, and values are strings (email addresses)
      cleanedData = { email: rawData };
    } else {
      cleanedData = cleanForFirestore(rawData);
    }

    const docRef = db.collection(collectionName).doc(docId);
    batch.set(docRef, cleanedData);
    count++;
    totalMigrated++;

    if (count === 400) {
      console.log(`  Writing batch of 400 items for [${collectionName}]...`);
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    console.log(`  Writing final batch of ${count} items for [${collectionName}]...`);
    await batch.commit();
  }

  console.log(`Successfully migrated [${collectionName}]: ${totalMigrated} documents created.`);
}

async function run() {
  try {
    console.log("Loading backup data...");
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));

    const collections = [
      "announcements",
      "loginIdEmails",
      "pendingRegistrations",
      "previousPapers",
      "quizAttempts",
      "quizzes",
      "recordedClasses",
      "syllabus",
      "upgradeRequests",
      "users"
    ];

    for (const col of collections) {
      await migrateCollection(col, backupData[col]);
    }

    console.log("\n==========================================");
    console.log("MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exit(1);
  }
}

run();
