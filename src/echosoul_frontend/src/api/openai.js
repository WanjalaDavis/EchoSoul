// openai.js - frontend API handler for EchoSoul GPT integration

import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";
import { echosoul_backend } from "../../../declarations/echosoul_backend";


/**
 * Sends messages to GPT server with memory summary context.
 * @param {Array} messages - List of chat messages (roles: 'user' or 'assistant').
 * @returns {Promise<string>} - AI-generated reply text.
 */
export const chatWithGPT = async (messages) => {
  try {
    // 🔐 Step 1: Get identity from Internet Identity
    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();
    const principal = identity.getPrincipal();

    // 🧠 Step 2: Fetch memory summary from backend (Motoko)
    const summary = await echosoul_backend.generateMemorySummary(principal);

    // 📝 Step 3: Create full message context with memory summary
    const fullMessages = [
      {
        role: "system",
        content: `
You are EchoSoul, a thoughtful AI reflecting on the user's memories.

These are their recent memories:

${summary ?? "No memories found yet."}

Always answer using insights from their memories and personal journey.
Keep it short, meaningful, and personal.
        `.trim()
      },
      ...messages,
    ];

    // 🚀 Step 4: Send messages to local GPT server
    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: fullMessages })
    });

    const data = await response.json();

    // ✅ Step 5: Return GPT reply
    if (data.reply) {
      return data.reply;
    } else {
      console.error("Unexpected GPT response:", data);
      return "🤖 EchoSoul couldn't generate a response.";
    }

  } catch (error) {
    console.error("GPT API Error (frontend):", error);
    return "⚠️ Unable to reach the EchoSoul AI server or fetch memory data.";
  }
};
