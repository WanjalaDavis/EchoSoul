import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

// ✅ Load .env variables
dotenv.config();

const app = express();
const PORT = 3001;

// ✅ Get API Key from environment
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn("⚠️ Missing OPENROUTER_API_KEY in .env. AI chat won't work.");
} else {
  console.log(`🔐 OpenRouter API key loaded: ${OPENROUTER_API_KEY.slice(0, 15)}...`);
}

// ====== Middleware ======
app.use(cors());
app.use(bodyParser.json());

// ====== System Prompt ======
const systemPrompt = `
You are EchoSoul, a personal AI companion that helps users reflect on their thoughts and emotions.

You don't have access to user memories — rely only on the current conversation to guide your responses.

Be empathetic, brief, and insightful.

If you don’t have enough context to answer, say:
"I’m still learning about you. Could you tell me more?"
`.trim();

// ====== Chat Endpoint ======
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  console.log("🧠 Incoming messages:", messages);

  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct", // ✅ Free model
        messages: fullMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log("🔍 OpenRouter response:", data);

    if (data?.error) {
      console.error("❌ API Error:", data.error.message);
      return res.status(500).json({ error: data.error.message });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({ error: "Invalid response from OpenRouter." });
    }

    const reply = data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("🔥 OpenRouter fetch error:", error);
    res.status(500).json({ error: "Server failed to fetch AI response." });
  }
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`✅ EchoSoul AI server running at http://localhost:${PORT}`);
});
