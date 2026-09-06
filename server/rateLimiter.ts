import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";

interface RateLimitEntry {
  timestamps: number[];
}

const userRequestMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per user

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of userRequestMap.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      userRequestMap.delete(uid);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const uid = req.user?.uid;
  if (!uid) {
    // If not authenticated yet, rate limit by IP
    const ip = req.ip || req.socket.remoteAddress || "anonymous";
    checkLimit(ip, res, next);
    return;
  }

  checkLimit(uid, res, next);
}

function checkLimit(identifier: string, res: Response, next: NextFunction): void {
  const now = Date.now();
  const entry = userRequestMap.get(identifier) || { timestamps: [] };

  // Filter timestamps within current window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);

    res.set("Retry-After", String(Math.max(1, retryAfterSeconds)));
    res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute. Try again in ${retryAfterSeconds}s.`,
      retryAfter: retryAfterSeconds,
    });
    return;
  }

  entry.timestamps.push(now);
  userRequestMap.set(identifier, entry);

  res.set("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
  res.set("X-RateLimit-Remaining", String(MAX_REQUESTS_PER_WINDOW - entry.timestamps.length));

  next();
}

export function getUserRateLimitStats(uid: string): { limit: number; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = userRequestMap.get(uid);
  if (!entry) {
    return { limit: MAX_REQUESTS_PER_WINDOW, remaining: MAX_REQUESTS_PER_WINDOW, resetInSeconds: 0 };
  }

  const activeTimestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
  const oldest = activeTimestamps[0] || now;
  const resetInSeconds = Math.max(0, Math.ceil((oldest + WINDOW_MS - now) / 1000));

  return {
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - activeTimestamps.length),
    resetInSeconds,
  };
}
