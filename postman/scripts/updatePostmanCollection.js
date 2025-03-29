const fs = require("fs");
const axios = require("axios");

const POSTMAN_COLLECTION_PATH = "../collections/Gemini API.postman_collection.json";
const GEMINI_ENDPOINTS_URL = `https://generativelanguage.googleapis.com/$discovery/OPENAPI3_0?version=v1beta&key=${api_key}`;
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const api_key = process.env.GEMINI_API_KEY;

if (!POSTMAN_API_KEY || !COLLECTION_UID) {
  console.error("Please set the POSTMAN_API_KEY and COLLECTION_UID environment variables.");
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