# 🧠 EchoSoul — Decentralized Digital Memory Companion

**EchoSoul** is a decentralized AI memory system built on the Internet Computer Protocol (ICP). It enables users to store personal memories, reflect on emotional states, connect with others, and engage in personalized AI conversations — preserving their digital consciousness forever.

---

## 🚀 Live Features

- 🌐 **Internet Identity Login** – Secure Web3 authentication with Internet Identity
- 📝 **User Profile** – Avatar, bio, and username setup
- 🧠 **Memory Logging** – Store thoughts, tags, and emotions on-chain
- 📊 **Memory Analytics** – Auto-generated memory summaries and usage stats
- 🤖 **AI Chat** – Talk to your "EchoSoul" AI based on your stored memories
- 🔗 **User Connections** – Socially link with other EchoSoul users
- 🔐 **Data Persistence** – All content is stored via Motoko on ICP's canisters

---

## 🛠️ Tech Stack

| Layer        | Tools / Languages                         |
|--------------|--------------------------------------------|
| 🔗 Blockchain | [Internet Computer Protocol](https://internetcomputer.org) |
| 🧠 Backend   | Motoko (stable memory, query/shared methods) |
| 🎨 Frontend  | React + Vite + Bootstrap + FontAwesome     |
| 🤖 AI Engine | Node.js Express server + OpenAI API         |
| 👤 Auth      | `@dfinity/auth-client` (Internet Identity) |
| 🎯 API Proxy | Custom OpenAI proxy at `localhost:3001`     |

---

## 📸 Screenshots

| Auth Flow | Memory Timeline | Chat with EchoSoul |
|-----------|-----------------|--------------------|
| ![auth](screenshots/login.png) | ![memories](screenshots/memories.png) | ![chat](screenshots/chat.png) |

---

## ⚙️ Setup Instructions

### 1. Prerequisites

- ✅ Node.js + npm
- ✅ `dfx` (Internet Computer SDK)
- ✅ OpenAI API Key
- ✅ Git

---

### 2. Clone & Install

```bash
git clone https://github.com/WanjalaDavis/echosoul.git
cd echosoul
npm install
