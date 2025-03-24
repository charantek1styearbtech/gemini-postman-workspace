const fs = require("fs");
const axios = require("axios");

const POSTMAN_COLLECTION_PATH = "../collections/Gemini API.postman_collections.json";
const GEMINI_ENDPOINTS_URL = "https://ai.google.dev/api/all-methods";
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;

// Fetch latest Gemini API endpoints
async function fetchGeminiEndpoints() {
    try {
        const response = await axios.get(GEMINI_ENDPOINTS_URL);
        return response.data.endpoints.map(endpoint => endpoint.url);  // Extract URLs
    } catch (error) {
        console.error("❌ Error fetching Gemini API endpoints:", error);
        process.exit(1);
    }
}

// Load Postman Collection & Update Endpoints
async function updatePostmanCollection() {
    try {
        const latestEndpoints = await fetchGeminiEndpoints();
        const postmanCollection = JSON.parse(fs.readFileSync(POSTMAN_COLLECTION_PATH, "utf8"));

        let endpointIndex = 0;
        postmanCollection.item.forEach(item => {
            if (item.request && latestEndpoints[endpointIndex]) {
                item.request.url.raw = latestEndpoints[endpointIndex];  // Replace URL
                endpointIndex++;
            }
        });

        fs.writeFileSync(POSTMAN_COLLECTION_PATH, JSON.stringify(postmanCollection, null, 4));
        console.log("✅ Postman collection updated successfully!");
    } catch (error) {
        console.error("❌ Error updating Postman collection:", error);
        process.exit(1);
    }
}

// Upload updated Postman Collection
async function uploadToPostman() {
    try {
        const postmanCollection = fs.readFileSync(POSTMAN_COLLECTION_PATH, "utf8");
        await axios.put(
            `https://api.getpostman.com/collections/${COLLECTION_UID}`,
            { collection: JSON.parse(postmanCollection) },
            {
                headers: {
                    "X-Api-Key": POSTMAN_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("🚀 Updated collection successfully uploaded to Postman!");
    } catch (error) {
        console.error("❌ Error uploading collection to Postman:", error.response.data);
        process.exit(1);
    }
}

// Run the update process
(async () => {
    await updatePostmanCollection();
    await uploadToPostman();
})();
