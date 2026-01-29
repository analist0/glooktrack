/**
 * Rate Limiter - הגבלת קצב בקשות
 * GlucoTrack AI Gateway
 */

const windowMs = 60_000; // 1 minute window
const maxRequests = 20; // max requests per window

type Entry = {
  count: number;
  resetAt: number;
};

const clients = new Map<string, Entry>();

export function checkRateLimit(clientId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let entry = clients.get(clientId);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    clients.set(clientId, entry);
  }

  entry.count++;

  // Periodically prune expired entries
  if (clients.size > 1000) {
    for (const [key, val] of clients) {
      if (now >= val.resetAt) clients.delete(key);
    }
  }

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
