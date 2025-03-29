const axios = require("axios");

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const API_KEY = process.env.API_KEY;  // Make sure API_KEY is correctly set

console.log("POSTMAN_API_KEY:", process.env.POSTMAN_API_KEY ? "Loaded" : "Missing");
console.log("COLLECTION_UID:", process.env.COLLECTION_UID ? "Loaded" : "Missing");
console.log("API_KEY:", process.env.API_KEY ? "Loaded" : "Missing");

const GEMINI_ENDPOINTS_URL = `https://generativelanguage.googleapis.com/$discovery/OPENAPI3_0?version=v1beta&key=${API_KEY}`;

if (!POSTMAN_API_KEY || !COLLECTION_UID || !API_KEY) {
  console.error("Please set the POSTMAN_API_KEY, COLLECTION_UID, and API_KEY environment variables.");
  process.exit(1);
}

const updatePostmanCollection = async () => {
    try {
        const response = await axios.get(GEMINI_ENDPOINTS_URL);
        console.log("Full API Response:", response.data); // Debugging output

        if (!response.data.paths) {
            throw new Error("API response does not contain expected 'paths' field.");
        }

        const endpoints = response.data.paths;
        console.log("Extracted Endpoints:", endpoints);
    } catch (error) {
        console.error("Error fetching Gemini endpoints:", error.response?.data || error.message);
    }
};

updatePostmanCollection();
