const fs = require("fs");
const axios = require("axios");

const POSTMAN_COLLECTION_PATH = "../collections/Gemini API.postman_collection.json";
const GEMINI_ENDPOINTS_URL = "https://ai.google.dev/api/all-methods";
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;

// Validate environment variables
if (!POSTMAN_API_KEY || !COLLECTION_UID) {
    console.error("❌ Error: POSTMAN_API_KEY or COLLECTION_UID is not set.");
    process.exit(1);
}

// Fetch latest Gemini API endpoints
async function fetchGeminiEndpoints() {
    try {
        const response = await axios.get(GEMINI_ENDPOINTS_URL);
        console.log("🔍 Gemini API Response:", JSON.stringify(response.data, null, 2)); // Debugging

        if (!response.data || !response.data.endpoints) {
            throw new Error("Invalid API response format. Expected 'endpoints' field.");
        }

        return response.data.endpoints.map(endpoint => endpoint.url); // Extract URLs
    } catch (error) {
        console.error("❌ Error fetching Gemini API endpoints:", error.message);
        process.exit(1);
    }
}

// Load Postman Collection & Update Endpoints
async function updatePostmanCollection() {
    try {
        const latestEndpoints = await fetchGeminiEndpoints();

        if (!fs.existsSync(POSTMAN_COLLECTION_PATH)) {
            throw new Error(`File not found: ${POSTMAN_COLLECTION_PATH}`);
        }

        const postmanCollection = JSON.parse(fs.readFileSync(POSTMAN_COLLECTION_PATH, "utf8"));
        console.log("📝 Current Postman Collection:", JSON.stringify(postmanCollection, null, 2)); // Debugging

        let endpointIndex = 0;
        postmanCollection.item.forEach(item => {
            if (item.request && item.request.url && latestEndpoints[endpointIndex]) {
                item.request.url.raw = latestEndpoints[endpointIndex]; // Replace URL
                endpointIndex++;
            }
        });

        fs.writeFileSync(POSTMAN_COLLECTION_PATH, JSON.stringify(postmanCollection, null, 4));
        console.log("✅ Postman collection updated successfully!");
    } catch (error) {
        console.error("❌ Error updating Postman collection:", error.message);
        process.exit(1);
    }
}

// Upload updated Postman Collection
async function uploadToPostman() {
    try {
        const postmanCollection = fs.readFileSync(POSTMAN_COLLECTION_PATH, "utf8");

        const response = await axios.put(
            `https://api.getpostman.com/collections/${COLLECTION_UID}`,
            { collection: JSON.parse(postmanCollection) },
            {
                headers: {
                    "X-Api-Key": POSTMAN_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("🚀 Updated collection successfully uploaded to Postman!", response.data);
    } catch (error) {
        console.error("❌ Error uploading collection to Postman:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

// Run the update process every minute
(async () => {
    await updatePostmanCollection();
    await uploadToPostman();
    setInterval(async () => {
        console.log("⏳ Checking for Gemini API updates...");
        await updatePostmanCollection();
        await uploadToPostman();
    }, 60 * 1000); // Every 60 seconds
})();
