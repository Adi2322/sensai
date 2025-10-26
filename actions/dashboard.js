"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🧠 Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });




/**
 * Generate industry insights using Gemini
 */
export const generateAIInsights = async (industry) => {
  const prompt = `
    Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
      ],
      "growthRate": number,
      "demandLevel": "HIGH" | "MEDIUM" | "LOW",
      "topSkills": ["skill1", "skill2"],
      "marketOutlook": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
      "keyTrends": ["trend1", "trend2"],
      "recommendedSkills": ["skill1", "skill2"]
    }

    IMPORTANT: Return ONLY the JSON. No markdown, explanations, or extra text.
    Include at least 5 roles, 5 skills, and 5 trends.
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  let data;
  try {
    data = JSON.parse(cleanedText);
  } catch (e) {
    console.error("❌ Failed to parse AI response:", cleanedText);
    throw new Error("Invalid AI response JSON");
  }

  // 🧹 Normalize fields and enums
  return {
    salaryRanges: data.salaryRanges || [],
    growthRate: Number(data.growthRate) || 0,
    demandLevel: data.demandLevel?.toUpperCase?.() || "MEDIUM",
    topSkills: data.topSkills || [],
    marketOutlook: data.marketOutlook?.toUpperCase?.() || "NEUTRAL",
    keyTrends: data.keyTrends || [],
    recommendedSkills: data.recommendedSkills || [],
  };
};

/**
 * Get or generate industry insights for a logged-in user
 */
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // 🧠 If no insights exist, generate and save them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      },
    });

    return industryInsight;
  }

  // ✅ Return existing insights
  return user.industryInsight;
}
