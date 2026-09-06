import express from "express";
import path from "path";
import fs from "fs";
import { verifyFirebaseToken, AuthenticatedRequest } from "./server/auth.js";
import { rateLimiter, getUserRateLimitStats } from "./server/rateLimiter.js";
import { validateChatPayload, validatePastSelfPayload } from "./server/validation.js";
import {
  generateJournalReflectionAndExtraction,
  answerPastSelfQuestion,
  generateLongitudinalInsights,
} from "./server/gemini.js";
import { getSecretStatus } from "./server/secrets.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security headers & JSON parsing
  app.use(express.json({ limit: "500kb" }));

  // Basic security middleware headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Gemini LifeGraph Server",
    });
  });

  // Firebase Authentication helper reverse-proxy for same-origin authDomain
  app.all("/__/auth/*", async (req, res) => {
    try {
      const targetUrl = `https://gen-lang-client-0229761603.firebaseapp.com${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && key.toLowerCase() !== "host") {
          headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const proxyRes = await fetch(targetUrl, fetchOptions);
      res.status(proxyRes.status);
      proxyRes.headers.forEach((val, key) => {
        if (key.toLowerCase() !== "content-encoding") {
          res.setHeader(key, val);
        }
      });

      const buffer = await proxyRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (proxyErr) {
      console.error("[Auth Proxy Error]:", proxyErr);
      res.status(502).send("Auth Proxy Gateway Error");
    }
  });

  // Authenticated Security Posture & Diagnostics endpoint
  app.get(
    "/api/security/status",
    verifyFirebaseToken,
    (req: AuthenticatedRequest, res) => {
      const uid = req.user?.uid;
      const secretStatus = getSecretStatus();
      const rateLimit = uid ? getUserRateLimitStats(uid) : null;

      res.json({
        status: "SECURE",
        authenticatedUid: uid,
        email: req.user?.email || null,
        emailVerified: req.user?.emailVerified || false,
        secretManager: {
          source: secretStatus.source,
          isCachedInMemory: secretStatus.isCached,
          hasValidKey: secretStatus.hasKey,
          lastFetchedAt: secretStatus.lastFetchedAt,
        },
        dataIsolation: {
          enforcedSchema: "/users/{uid}/*",
          scopedToVerifiedUid: uid,
          crossUserAccessBlocked: true,
        },
        rateLimit,
      });
    }
  );

  // Authenticated multi-turn Gemini reflection & automatic LifeGraph entity extraction
  app.post(
    "/api/chat/reflect",
    verifyFirebaseToken,
    rateLimiter,
    async (req: AuthenticatedRequest, res) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "User context missing." });
        return;
      }

      const validation = validateChatPayload(req.body);
      if (!validation.isValid || !validation.prompt) {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: validation.message || "Invalid payload.",
        });
        return;
      }

      try {
        const { reflection, extractedMemories, secretSource } =
          await generateJournalReflectionAndExtraction(
            validation.prompt,
            validation.history || []
          );

        res.json({
          reflection,
          extractedMemories,
          secretSource,
          timestamp: new Date().toISOString(),
          chatId: validation.chatId,
        });
      } catch (genError: unknown) {
        const rawMsg = genError instanceof Error ? genError.message : "Generation failed";
        const sanitizedMsg = rawMsg.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_KEY]");
        console.error(`[Gemini Error for user ${uid}]:`, sanitizedMsg);

        res.status(500).json({
          error: "GENERATION_ERROR",
          message: "Failed to generate reflection. Please try again in a moment.",
        });
      }
    }
  );

  // Ask Your Past Self: Evidence-based historical memory query
  app.post(
    "/api/ask-past-self",
    verifyFirebaseToken,
    rateLimiter,
    async (req: AuthenticatedRequest, res) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "User context missing." });
        return;
      }

      const validation = validatePastSelfPayload(req.body);
      if (!validation.isValid || !validation.question) {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: validation.message || "Invalid question or memory payload.",
        });
        return;
      }

      try {
        const result = await answerPastSelfQuestion(
          uid,
          validation.question,
          validation.memories || []
        );

        res.json(result);
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : "Past Self query failed";
        console.error(`[PastSelf Error for user ${uid}]:`, rawMsg);
        res.status(500).json({
          error: "QUERY_ERROR",
          message: "Failed to retrieve past memories. Please try again.",
        });
      }
    }
  );

  // Longitudinal Insights Synthesis
  app.post(
    "/api/insights/generate",
    verifyFirebaseToken,
    rateLimiter,
    async (req: AuthenticatedRequest, res) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "User context missing." });
        return;
      }

      const validation = validatePastSelfPayload({
        question: "generate_insights",
        memories: req.body?.memories,
      });

      try {
        const result = await generateLongitudinalInsights(uid, validation.memories || []);
        res.json(result);
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : "Insight generation failed";
        console.error(`[Insights Error for user ${uid}]:`, rawMsg);
        res.status(500).json({
          error: "INSIGHTS_ERROR",
          message: "Failed to synthesize longitudinal insights.",
        });
      }
    }
  );

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Gemini LifeGraph backend listening on port ${PORT}`);
  });
}

startServer();
