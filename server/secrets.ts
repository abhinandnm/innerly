import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

interface SecretStatus {
  source: string;
  isCached: boolean;
  hasKey: boolean;
  lastFetchedAt: string | null;
}

let cachedSecret: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache
let secretSourceDescription = "Uninitialized";

export async function getGeminiApiKey(projectId?: string): Promise<{ apiKey: string; source: string }> {
  // Check memory cache
  const now = Date.now();
  if (cachedSecret && now - lastFetchTime < CACHE_TTL_MS) {
    return { apiKey: cachedSecret, source: `${secretSourceDescription} (In-Memory Cached)` };
  }

  // 1. Immediately check runtime environment secret (standard in Google AI Studio, 0ms latency)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    cachedSecret = process.env.GEMINI_API_KEY.trim();
    lastFetchTime = now;
    secretSourceDescription = "Google Cloud Runtime Secret (process.env.GEMINI_API_KEY)";
    return { apiKey: cachedSecret, source: secretSourceDescription };
  }

  // 2. Fallback to Google Cloud Secret Manager with a strict short timeout if configured
  const effectiveProjectId =
    projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  const secretName = process.env.GEMINI_SECRET_NAME || "gemini-api-key";

  if (effectiveProjectId) {
    const secretPath = `projects/${effectiveProjectId}/secrets/${secretName}/versions/latest`;
    try {
      const client = new SecretManagerServiceClient();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Secret Manager fetch timed out")), 2000)
      );
      const fetchPromise = client.accessSecretVersion({ name: secretPath });
      const [version] = await Promise.race([fetchPromise, timeoutPromise]);
      const payload = version.payload?.data?.toString();

      if (payload && payload.trim().length > 0) {
        cachedSecret = payload.trim();
        lastFetchTime = now;
        secretSourceDescription = `Google Cloud Secret Manager (${secretName})`;
        return { apiKey: cachedSecret, source: secretSourceDescription };
      }
    } catch (smError: unknown) {
      const errMsg = smError instanceof Error ? smError.message : String(smError);
      console.warn(`[SecretManager] Direct Secret Manager lookup bypassed (${errMsg}).`);
    }
  }

  throw new Error(
    "Gemini API credential could not be retrieved from Google Cloud Secret Manager or runtime environment. Ensure GEMINI_API_KEY is defined in .env or environment."
  );
}

export function getSecretStatus(): SecretStatus {
  return {
    source: secretSourceDescription,
    isCached: cachedSecret !== null,
    hasKey: cachedSecret !== null || Boolean(process.env.GEMINI_API_KEY),
    lastFetchedAt: lastFetchTime > 0 ? new Date(lastFetchTime).toISOString() : null,
  };
}
