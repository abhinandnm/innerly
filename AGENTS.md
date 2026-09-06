# AGENTS.md — AI Studio Security & Production Directives

This project enforces the Google AI Studio Security & Production Constitution defined in `GEMINI.md`.

## Core Directives Summary
- **Authentication**: Firebase Auth with server-side RS256 token verification via Google x509 certs.
- **Tenant Isolation**: Firestore rules restrict all user data to `/users/{uid}/**`.
- **Secret Isolation**: Gemini API Key retrieved server-side only via container environment or Google Cloud Secret Manager.
- **AI Safety**: Anti-delimiter injection sanitization, factual memory grounding, and longitudinal pattern synthesis.
