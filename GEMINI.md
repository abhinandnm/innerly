# Google AI Studio Security & Production Constitution

This document defines the persistent enterprise-grade production directives for Google AI Studio, establishing strict rules for threat modeling, authentication, database isolation, secret handling, and defensive architecture.

---

## Directive 1: Threat Modeling & Defensive Boundary Enforcement
1. **Server-Side Decoupling**: Any interaction involving AI models (Gemini API) or backend credentials must be proxied through dedicated server-side endpoints (`/api/*`). The browser client must NEVER hold direct access to administrative privileges or shared API secrets.
2. **Untrusted Client Inputs**: All client payloads must undergo strict schema validation and sanitization. Input text must be bounded in length and stripped of prompt delimiter injection vectors (e.g., XML/system instruction boundary markers).
3. **Defense-in-Depth Rate Limiting**: Every API route must be protected by per-user and per-IP rate limiters to prevent resource exhaustion and credential abuse.

---

## Directive 2: Zero-Trust Identity & Authentication (Firebase Auth)
1. **Cryptographic Token Verification**: Client requests must transmit Firebase ID tokens via the `Authorization: Bearer <ID_TOKEN>` header.
2. **Server-Side Signature Validation**:
   - The server must verify token signatures against Google's live public x509 certificates (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`).
   - Validate token audience (`aud`), issuer (`iss`), expiration (`exp`), and algorithm (`RS256`).
3. **No Client-Supplied Identity**: The user ID (`uid`) used for data access, rate limiting, and prompt scoping must originate exclusively from the cryptographically verified token payload (`decodedToken.sub`), never from client-provided query params or body fields.

---

## Directive 3: Strict Database Tenancy & Data Isolation (Cloud Firestore)
1. **Tenancy Hierarchy**: All user-authored content, journal logs, summaries, memories, and insights must be nested strictly under `/users/{userId}/...`.
2. **Firestore Security Rules**:
   - Every rule block must enforce `request.auth != null` and `request.auth.uid == userId`.
   - Wildcard global collection queries or cross-tenant reads are strictly forbidden.
3. **Data Segregation in AI Prompts**: Historical memory retrieval must be strictly scoped to the authenticated user's records. Delimiters (`<retrieved_journal_data user_id="...">`) must isolate retrieved memories from current user prompts to prevent indirect prompt injection.

---

## Directive 4: Enterprise Secret Management (Google Cloud Secret Manager)
1. **Zero Hardcoded Credentials**: API keys, service tokens, and private credentials must NEVER be committed to source code or bundled into client assets.
2. **Tiered Resolution Strategy**:
   - Primary: Secure container runtime environment (`process.env.GEMINI_API_KEY`).
   - Secondary / Enterprise Fallback: Google Cloud Secret Manager via `@google-cloud/secret-manager` targeting `projects/{PROJECT_ID}/secrets/GEMINI_API_KEY/versions/latest`.
3. **In-Memory Caching**: Resolved secrets are securely held in memory without persisting sensitive tokens to disk or exposing them in response payloads.
4. **Client Exemption Warning**: Public client builds must never bundle keys prefixed with `VITE_` for AI services.

---

## Directive 5: AI Grounding & Anti-Hallucination Guardrails
1. **Evidence-Based Grounding**: When performing historical queries ("Ask Past Self" or longitudinal synthesis), the model must only answer based on explicit evidence in the user's isolated records.
2. **Sufficient Evidence Protocol**: If evidence is missing or ambiguous, the model must explicitly state that no sufficient journal evidence exists rather than guessing or extrapolating.
3. **Multi-Turn Isolation**: Conversation histories must retain user state while keeping system directives protected in isolated system instruction buffers.
