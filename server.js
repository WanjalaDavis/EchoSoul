import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Personal system prompt
const systemPrompt = `
You are EchoSoul, a deeply personal AI assistant that reflects on a user’s memories, thoughts, and emotions.
Your purpose is to help the user understand themselves through reflection.

Instructions:
- Always relate your answers to the user’s memories.
- Be specific. Avoid generic advice.
- If memories mention stress, joy, or doubt, respond with empathy and personal insight.
- If you don't have enough information, say: “I don’t remember enough about that yet. Could you tell me more?”
`;

// 🧠 Route to handle chat requests
app.post("/api/chat", async (req, res) => {
  const { messages, principal } = req.body;

  console.log("🧠 Incoming messages:", messages);
  console.log("🔑 Principal:", principal);

  // 🧠 Fetch latest memories from Motoko canister
  let memorySummary = "The user has no stored memories yet.";
  try {
    const motokoRes = await fetch(`http://localhost:4943/api/v1/memories/${principal}`);
    const userMemories = await motokoRes.json();

    if (Array.isArray(userMemories) && userMemories.length > 0) {
      const memoryTexts = userMemories
        .map((m) => `- "${m.text}"`)
        .slice(-5)
        .join("\n");
      memorySummary = `Here are some of the user's recent memories:\n${memoryTexts}`;
    }
  } catch (error) {
    console.error("🛑 Failed to fetch memories from Motoko:", error.message);
  }

  const fullMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: memorySummary },
    ...messages,
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct", // ✅ free model
        messages: fullMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log("🔍 OpenRouter response:", data);

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid response from OpenRouter." });
    }

    const reply = data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("🔥 OpenRouter error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ EchoSoul AI server running at http://localhost:${PORT}`);
});
