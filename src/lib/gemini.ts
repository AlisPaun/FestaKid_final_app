import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateInvitation(partyDetails: {
  title: string;
  theme: string;
  date: string;
  location: string;
  description: string;
}, language: string = "it") {
  const languageNames: Record<string, string> = {
    it: "Italian",
    en: "English",
    ro: "Romanian",
    fr: "French"
  };

  const targetLanguage = languageNames[language] || "Italian";

  const prompt = `Create a fun and engaging birthday party invitation for a child.
  Title: ${partyDetails.title}
  Theme: ${partyDetails.theme}
  Date: ${partyDetails.date}
  Location: ${partyDetails.location}
  Extra Details: ${partyDetails.description}
  
  IMPORTANT: The invitation MUST be written entirely in ${targetLanguage}.
  Provide the response in a friendly, excited tone suitable for kids and parents.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a creative party planner who writes amazing invitations.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating invitation:", error);
    return "Could not generate invitation. Please try again.";
  }
}

export async function searchLocation(query: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the precise address and details for this location: ${query}`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error searching location:", error);
    return null;
  }
}
