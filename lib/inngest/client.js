import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "senseai", // Unique app ID
  name: "Sensai",
  credentials: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});