require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testAI() {
    const response = await ai.interactions.create({
        model: "gemini-3.8-flash",

        input: `
Analyze this support ticket:

Title:
Wi-Fi completely down in computer lab

Description:
Internet is unavailable for 40 students in Lab 3.

Category:
Network

Return:
1. Suggested priority
2. Confidence score between 0 and 1
3. Short analysis
        `,

        response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
                type: "object",
                properties: {
                    suggested_priority: {
                        type: "string",
                        enum: ["Low", "Medium", "High", "Critical"]
                    },
                    confidence_score: {
                        type: "number"
                    },
                    analysis: {
                        type: "string"
                    }
                },
                required: [
                    "suggested_priority",
                    "confidence_score",
                    "analysis"
                ]
            }
        }
    });

    console.log(response.output_text);
}

testAI();