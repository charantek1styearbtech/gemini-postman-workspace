import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: "./postman/.env" });

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const API_KEY = process.env.API_KEY;  // Make sure API_KEY is correctly set

console.log("POSTMAN_API_KEY:", process.env.POSTMAN_API_KEY ? "Loaded" : "Missing");
console.log("COLLECTION_UID:", process.env.COLLECTION_UID ? "Loaded" : "Missing");
console.log("API_KEY:", process.env.API_KEY ? "Loaded" : "Missing");

const GEMINI_ENDPOINTS_URL = `https://generativelanguage.googleapis.com/$discovery/OPENAPI3_0?version=v1beta&key=${API_KEY}`;
const POSTMAN_API_URL = `https://api.getpostman.com/collections/${COLLECTION_UID}`;


if (!POSTMAN_API_KEY || !COLLECTION_UID || !API_KEY) {
  console.error("Please set the POSTMAN_API_KEY, COLLECTION_UID, and API_KEY environment variables.");
  process.exit(1);
}

const fetchGeminiEndPoints = async () => {
    try {
        const response = await axios.get(GEMINI_ENDPOINTS_URL);
        if (!response.data.paths) {
            throw new Error("API response does not contain expected 'paths' field.");
        }
        return response.data;;
    } catch (error) {
        console.error("Error fetching Gemini endpoints:", error.response?.data || error.message);
        return null; 
    }
};

const fetchPostmanCollection = async () => {
    try{
        const response = await axios.get(POSTMAN_API_URL, {
            headers: { "X-Api-Key": POSTMAN_API_KEY }
        });
        return response.data.collection;
    }
    catch(error){
        console.error("Error updating Postman collection:", error.response?.data || error.message);
    }
}

const generateBody = (endpoints, schemaRef) => {
    if (!schemaRef || !schemaRef.startsWith('#/components/schemas/')) {
        throw new Error("Invalid schema reference provided.");
    }

    const schemaName = schemaRef.replace('#/components/schemas/', '');
    const schemaObject = endpoints.components.schemas[schemaName];

    if (!schemaObject) {
        throw new Error(`Schema ${schemaName} not found in the endpoints.`);
    }

    const body = {};

    if (schemaObject.properties) {
        for (const [key, value] of Object.entries(schemaObject.properties)) {
            if (value.type === 'array' && value.items && value.items["$ref"]) {
                // If the property is an array of objects with a schema reference
                body[key] = [generateBody(endpoints, value.items["$ref"])];
            } else if (value.type === 'object' && value.allOf) {
                // If the property is an object that uses allOf to compose schemas
                // Loop through each item in allOf
                body[key] = {};
                value.allOf.forEach((item) => {
                    if (item["$ref"]) {
                        Object.assign(body[key], generateBody(endpoints, item["$ref"]));
                    } else {
                        // Handle other properties of the schema
                        Object.assign(body[key], `{{${key}}}`);
                    }
                });
            } else {
                // Handle other types if needed (e.g., primitive types)
                body[key] = `{{${key}}}`; // Placeholder for other types
            }
        }
    }
    
    return body;
};

const updateCollection = async (collection,endpoints) => {
    const body= generateBody(endpoints,endpoints.paths["/v1beta/models/{model}:generateContent"].post.requestBody.content["application/json"].schema["$ref"]);
    if (collection.item && collection.item.length > 0) {
        for (const items of collection.item){
            if(items.name==='Text Generation')
            {
                for (const item of items.item){
                    if(item.name==='text-only-input')
                    {
                        item.request.body={
                            mode: "raw",
                            raw: JSON.stringify(body, null, 2),
                        }
                    }
                }
            }
        }
    }

    // Update the collection on Postman
    try {
        const response = await axios.put(
            POSTMAN_API_URL,
            { collection },
            { headers: { "X-Api-Key": POSTMAN_API_KEY, "Content-Type": "application/json" } }
        );
        console.log("✅ Postman collection updated successfully!", response.data);
    } catch (error) {
        console.error("❌ Error updating Postman collection:", error.response?.data || error.message);
    }
}
const endpoints = await fetchGeminiEndPoints();
const collection = await fetchPostmanCollection();
console.log("Gemini Endpoints:", collection.item[0].item[0]);
await updateCollection(collection,endpoints);
