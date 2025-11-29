import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Safely access API key to prevent runtime ReferenceError if process is undefined
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Error accessing process.env", e);
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const analyzeTaskWithAI = async (taskTitle: string): Promise<AIAnalysisResult | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const prompt = `
      You are a productivity expert assistant helping a user organize their tasks in Hebrew.
      Analyze the following task title: "${taskTitle}".
      
      1. Break it down into 3-5 concrete, actionable subtasks (in Hebrew).
      2. Estimate the priority (low, medium, high) based on urgency implied or general complexity.
      3. Estimate time required (e.g., "30 דקות", "שעתיים", "מספר ימים").
      4. Write a short, encouraging description in Hebrew.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of actionable subtasks in Hebrew"
            },
            priority: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
              description: "The priority level"
            },
            estimatedTime: {
              type: Type.STRING,
              description: "Estimated time to complete in Hebrew"
            },
            refinedDescription: {
              type: Type.STRING,
              description: "A short description in Hebrew"
            }
          },
          required: ["subtasks", "priority", "estimatedTime", "refinedDescription"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return null;

    return JSON.parse(resultText) as AIAnalysisResult;

  } catch (error) {
    console.error("Error analyzing task with Gemini:", error);
    return null;
  }
};