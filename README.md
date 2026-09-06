# Innerly — Production-Grade Personal Gemini Journal

> **Google AI Studio Ideathon Challenge Submission**  
> An authenticated, zero-trust AI life companion and reflective journal built with **Google Gemini**, **Firebase Auth**, **Cloud Firestore**, and **Google Cloud Run**.

[![Live App](https://img.shields.io/badge/Live%20App-Cloud%20Run-brightgreen?logo=google-cloud&logoColor=white)](https://innerly-477860044065.us-central1.run.app/)
[![Article](https://img.shields.io/badge/Medium-Article-black?logo=medium&logoColor=white)](https://medium.com/@abhinandnm327/innerly-evolving-the-personal-journal-with-generative-ai-google-cloud-0cc39c109ebf)
[![GitHub](https://img.shields.io/badge/Repository-GitHub-181717?logo=github&logoColor=white)](https://github.com/abhinandnm/innerly)
[![Google AI Studio](https://img.shields.io/badge/Built%20With-Google%20AI%20Studio-4285F4?logo=google&logoColor=white)](https://ai.studio)
[![Gemini API](https://img.shields.io/badge/Model-Gemini%20Flash-blueviolet?logo=google-gemini)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Auth%20%26%20Database-Firebase%20%2F%20Firestore-FFA611?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Cloud Run](https://img.shields.io/badge/Deploy-Google%20Cloud%20Run-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌐 Live Production Links

* **🚀 Live Deployed App (Cloud Run):** [https://innerly-477860044065.us-central1.run.app/](https://innerly-477860044065.us-central1.run.app/)
* **📝 Medium Case Study & Demo Post:** [Innerly: Evolving the Personal Journal with Generative AI & Google Cloud (#AccelerateAIwithCloudRun)](https://medium.com/@abhinandnm327/innerly-evolving-the-personal-journal-with-generative-ai-google-cloud-0cc39c109ebf)
* **💻 GitHub Source Repository:** [https://github.com/abhinandnm/innerly](https://github.com/abhinandnm/innerly)

---

## 📖 Overview

Most AI applications look compelling in prototypes but collapse in production: API keys exposed in browser network tabs, shared unpartitioned databases, absent authentication, and vulnerability to prompt injection.

**Innerly** was designed to solve this from the ground up. By configuring **Google AI Studio** with an enterprise-grade security constitution (`GEMINI.md` & `AGENTS.md`) prior to code generation, Innerly enforces defensive boundaries, cryptographic identity verification, strict database isolation, and secret decoupling across every layer of the application.

---

## 🏆 Ideathon Challenge Alignment

| Phase | Challenge Requirement | Innerly Implementation & Defense | Status |
| :--- | :--- | :--- | :---: |
| **Phase 1** | **Studio Constitution & Threat Modeling** | Custom directives baked into `GEMINI.md` and `AGENTS.md` enforcing server-side decoupling, delimiter sanitization, rate limiting, and zero-trust identity before generating code. | **PASS** |
| **Phase 2.1** | **User Authentication** | Firebase Auth with Google OAuth + Anonymous fallback. Tokens are cryptographically verified server-side using Google's live x509 public certificates (`securetoken.google.com`). | **PASS** |
| **Phase 2.2** | **Multi-Turn AI Interaction** | Natural conversational journaling powered by `@google/genai` with verified multi-turn context retention, structured reflection extraction, and automatic model fallback. | **PASS** |
| **Phase 2.3** | **Isolated Data Storage** | Per-user Cloud Firestore hierarchy (`/users/{uid}/**`). Security rules mathematically enforce `request.auth.uid == userId` for all document reads and writes. | **PASS** |
| **Phase 2.4** | **Secure Key Management** | Server-side credential isolation via `@google-cloud/secret-manager` and container runtime secrets. Zero API keys bundled in client code or exposed in browser network traffic. | **PASS** |
| **Phase 3** | **Original Enhancements** | **Ask Past Self** (temporally grounded memory QA with zero hallucinations), **Longitudinal Pattern Synthesizer**, and **Live Security & Integrity Drawer**. | **PASS** |

---

## ✨ Key Features & Enhancements

### 1. Multi-Turn Reflective Dialogue & Memory Extraction
* Real-time conversation with Gemini to unpack daily thoughts, mental models, and life decisions.
* Automatically extracts structured memory primitives (**Goals**, **Projects**, **Challenges**, **Mindsets**, **Decisions**) stored directly in the user's isolated vault.

### 2. "Ask Past Self" — Grounded Historical Synthesis (Phase 3 Original)
* Query your personal history with natural language (e.g., *"What programming goals did I set last month?"*).
* Grounded exclusively in the user's verified journal records using strict delimiter isolation (`<retrieved_journal_data>`).
* **Anti-Hallucination Protocol:** If no explicit record exists, the model states that no sufficient journal evidence was found rather than fabricating details.

### 3. Longitudinal Pattern Synthesizer (Phase 3 Original)
* Discovers recurring themes, blockers, progress shifts, and commitments across long-term journal logs.
* Employs structured JSON schema synthesis requiring at least two distinct historical data points before surfacing an insight.

### 4. Live Security & Integrity Drawer (Phase 3 Original)
* Provides transparent, in-app visibility into cryptographic signature checks, Secret Manager status, Firebase project binding, and token rate limits (25 requests/minute).

---

## 🏛 Architecture & Threat Model

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│  React 18 (Vite) + Tailwind CSS + Lucide Icons              │
│  • Firebase Client SDK (OAuth & Anonymous Sign-In)          │
│  • Client-Side Token Acquisition (Bearer Header)             │
│  • Zero Secret Keys Stored Locally                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON Payloads
                               │ Authorization: Bearer <ID_TOKEN>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server-Side Express Proxy                 │
│  Port 3000 (Dockerized Node 22 / Cloud Run)                  │
│                                                             │
│  1. Input Sanitization & Delimiter Neutralization           │
│  2. RS256 Token Verification (Google x509 Certs)            │
│  3. Rate Limiter (25 req/min per UID / IP)                  │
│  4. Tiered Secret Manager Resolution                        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│  Google Cloud Secret Mgr    │ │    Google Gemini Models     │
│  • projects/{ID}/secrets/   │ │    • gemini-2.5-flash       │
│    GEMINI_API_KEY           │ │    • gemini-3.1-flash-lite  │
│  • In-memory caching        │ │    • Structured Output JSON │
└─────────────────────────────┘ └─────────────────────────────┘
                               ▲
                               │ User-scoped persistence
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Firestore Database                 │
│  Database: ai-studio-79f71ae4-e602-4947-93c7-8cce5dbcfe71   │
│  Hierarchy: /users/{uid}/chats /memories /insights          │
│  Rules: request.auth != null && request.auth.uid == userId  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Constitution Highlights

Defined in [`GEMINI.md`](GEMINI.md) and [`AGENTS.md`](AGENTS.md):

* **Zero-Trust Identity:** The user ID (`uid`) used for prompts, data isolation, and rate-limiting is derived exclusively from cryptographically verified token claims (`sub`), never from client-provided query parameters or body payloads.
* **Server-Side Decoupling:** The browser never makes direct API calls to Gemini. All requests are routed through `/api/*`.
* **Prompt Delimiter Isolation:** User inputs are scrubbed of XML/system tags (`<user_journal_entry>`, `<system_instruction>`), and memory payloads are strictly sandboxed.
* **Multi-Model Availability Fallback:** Automatic failover across `gemini-2.5-flash` and `gemini-3.1-flash-lite` guarantees uninterrupted availability.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20 or v22 LTS
* **npm**: v10+
* **Google Cloud Project** with Gemini API enabled
* **Firebase Project** with Authentication and Cloud Firestore enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abhinandnm/innerly.git
   cd innerly
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Provide your API key and Firebase configuration:
   ```env
   # Server-side secrets (NEVER prefix with VITE_)
   GEMINI_API_KEY=your_gemini_api_key_here
   GCP_PROJECT_ID=your_gcp_project_id

   # Client-side public Firebase configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Verification

Innerly includes strict validation tools:

```bash
# Type check and lint codebase
npm run lint

# Production build test (Vite + esbuild CJS server bundle)
npm run build

# Health check ping
curl http://localhost:3000/api/health
```

---

## ☁️ Deployment

### Option 1: Google AI Studio 1-Click Deploy (Fastest)
1. Open your project in Google AI Studio Build.
2. Click **Deploy to Cloud Run** in the top navigation bar.
3. Select your Google Cloud project and region.

### Option 2: Google Cloud Run via CLI

Deploy directly using the bundled multi-stage `Dockerfile`:

```bash
# 1. Authenticate and configure project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy to Cloud Run
gcloud run deploy innerly \
  --source . \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### Post-Deployment: Authorize Firebase Domain
1. In the [Firebase Console](https://console.firebase.google.com/), open **Authentication** → **Settings** → **Authorized domains**.
2. Add your newly provisioned Cloud Run domain (`https://innerly-xxxx.a.run.app`).

---

## 📁 Repository Structure

```
├── .dockerignore                 # Docker build ignore rules
├── .env.example                  # Environment variable specification template
├── AGENTS.md                     # AI Studio persistent agent directives
├── Dockerfile                    # Multi-stage production container build
├── GEMINI.md                     # Google AI Studio Security & Production Constitution
├── README.md                     # Project documentation
├── firebase-applet-config.json   # Active Firebase configuration
├── firestore.rules               # Cloud Firestore security rules
├── index.html                    # Application HTML entry point
├── metadata.json                 # AI Studio permissions and configuration
├── package.json                  # Scripts and dependencies
├── server.ts                     # Express server & API routes
├── server/
│   ├── auth.ts                   # Firebase ID token RS256 verification
│   ├── gemini.ts                 # Gemini SDK multi-turn & memory extraction
│   ├── rateLimit.ts              # In-memory sliding rate limiter
│   ├── secrets.ts                # Google Cloud Secret Manager integration
│   └── validation.ts             # Payload & prompt delimiter sanitization
└── src/
    ├── App.tsx                   # Main React application shell
    ├── components/               # Modular UI components
    │   ├── AskPastSelfModal.tsx  # Historical memory search modal
    │   ├── InsightsModal.tsx     # Longitudinal pattern synthesis modal
    │   ├── MemoryVaultModal.tsx  # Extracted memory cards & filters
    │   ├── SecurityModal.tsx     # Cryptographic integrity drawer
    │   └── SettingsModal.tsx     # Account management & sign-out
    ├── lib/                      # Firebase client initialization & storage
    └── types.ts                  # Shared TypeScript interfaces
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
