import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: "./postman/.env" });

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const API_KEY = process.env.API_KEY;

console.log("POSTMAN_API_KEY:", POSTMAN_API_KEY ? "Loaded" : "Missing");
console.log("COLLECTION_UID:", COLLECTION_UID ? "Loaded" : "Missing");
console.log("API_KEY:", API_KEY ? "Loaded" : "Missing");

const GEMINI_ENDPOINTS_URL = `https://generativelanguage.googleapis.com/$discovery/OPENAPI3_0?version=v1beta&key=${API_KEY}`;
const POSTMAN_API_URL = `https://api.getpostman.com/collections/${COLLECTION_UID}`;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    return response.data;
  } catch (error) {
    console.error("Error fetching Gemini endpoints:", error.response?.data || error.message);
    return null;
  }
};

const fetchPostmanCollection = async () => {
  try {
    const response = await axios.get(POSTMAN_API_URL, {
      headers: { "X-Api-Key": POSTMAN_API_KEY },
    });
    return response.data.collection;
  } catch (error) {
    console.error("Error fetching Postman collection:", error.response?.data || error.message);
  }
};

const generateBody = (endpoints, schemaRef) => {
  if (!schemaRef || !schemaRef.startsWith("#/components/schemas/")) {
    throw new Error("Invalid schema reference provided.");
  }

  const schemaName = schemaRef.replace("#/components/schemas/", "");
  const schemaObject = endpoints.components.schemas[schemaName];

  if (!schemaObject) {
    throw new Error(`Schema ${schemaName} not found in the endpoints.`);
  }

  const body = {};

  if (schemaObject.properties) {
    for (const [key, value] of Object.entries(schemaObject.properties)) {
      if (value.type === "array" && value.items && value.items["$ref"]) {
        body[key] = [generateBody(endpoints, value.items["$ref"])];
      } else if (value.type === "object" && value.allOf) {
        body[key] = {};
        value.allOf.forEach((item) => {
          if (item["$ref"]) {
            Object.assign(body[key], generateBody(endpoints, item["$ref"]));
          } else {
            Object.assign(body[key], `{{${key}}}`);
          }
        });
      } else {
        body[key] = `{{${key}}}`;
      }
    }
  }

  return body;
};

const updateCollection = async (collection, endpoints) => {
  const body = generateBody(
    endpoints,
    endpoints.paths["/v1beta/models/{model}:generateContent"].post.requestBody.content["application/json"].schema["$ref"]
  );

  const prompt = `You are a helpful assistant that generates JSON request bodies for text generation APIs.\n\nCreate a JSON request body for Gemini's text generation endpoint (text-only-input) that includes the following fields:\n- text : the input text for the model to generate content from.\n- temperature: A float between 0 and 1 (e.g., 0.7)\n- top_p: A float between 0 and 1 (e.g., 0.8)\n- top_k: An integer (e.g., 40)\n\nUse realistic placeholder values and structure the JSON so it's easy to understand and ready to send in a POST request. Return only the JSON format, with comments for each parameter.\nHere is the original Schema of Request Body:\n${JSON.stringify(body, null, 2)}`;

  const newBody = await model.generateContent(prompt);
  const rawText = await newBody.response.text().replace(/```json|```/g, "").trim();;

  let jsonParsed;
  try {
    jsonParsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Failed to parse response JSON:", err);
    console.log("Raw Gemini output:", rawText);
    return;
  }

  if (collection.item && collection.item.length > 0) {
    for (const items of collection.item) {
      if (items.name === "Text Generation") {
        for (const item of items.item) {
          if (item.name === "text-only-input") {
            item.request.body = {
              mode: "raw",
              raw: JSON.stringify(jsonParsed, null, 2),
            };
          }
        }
      }
    }
  }

  try {
    const response = await axios.put(
      POSTMAN_API_URL,
      { collection },
      {
        headers: {
          "X-Api-Key": POSTMAN_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Postman collection updated successfully!", response.data);
  } catch (error) {
    console.error("❌ Error updating Postman collection:", error.response?.data || error.message);
  }
};

const endpoints = await fetchGeminiEndPoints();
const collection = await fetchPostmanCollection();
await updateCollection(collection, endpoints);
