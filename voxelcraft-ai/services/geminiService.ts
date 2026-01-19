
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Removed global initialization to follow guidelines of creating instance right before usage
// and ensuring process.env.API_KEY is used directly.

export const analyzeWorldInspiration = async (base64Image: string) => {
  // Fix: Initialize GoogleGenAI with specific named parameter as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "Analyze this image and describe how it could be translated into a Minecraft-style voxel build. Suggest specific block types (grass, stone, wood, water, sand) and architectural features. Keep the response concise and inspiring for a player." }
        ]
      },
    });
    // Fix: Use .text property directly (not a method) to extract output
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze image. Please try again.";
  }
};

export const generateVoxelConcept = async (prompt: string) => {
  // Fix: Initialize GoogleGenAI right before the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-quality 3D voxel art style concept of: ${prompt}. Isometric view, vibrant colors, Minecraft aesthetic.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    // Fix: Iterate through all parts to find the image part as recommended
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return null;
  }
};
