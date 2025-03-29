const fs = require("fs");
const axios = require("axios");

const POSTMAN_COLLECTION_PATH = "../collections/Gemini API.postman_collection.json";
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const api_key = process.env.API_KEY;
const GEMINI_ENDPOINTS_URL = `https://generativelanguage.googleapis.com/$discovery/OPENAPI3_0?version=v1beta&key=${api_key}`;

if (!POSTMAN_API_KEY || !COLLECTION_UID || api_key) {
  console.error("Please set the POSTMAN_API_KEY, COLLECTION_UID and api_key environment variables.");
  process.exit(1);
}

const updatePostmanCollection = async () => {
    try{
        const response = await axios.get(`${GEMINI_ENDPOINTS_URL}`);
        const endpoints = response.paths;
        console.log(endpoints)
    }
    catch(error){
        console.log('Error fetching Gemini endpoints:', error.message);
    }
}

updatePostmanCollection();
