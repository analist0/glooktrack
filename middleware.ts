import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "anonymous";
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.x.ai https://api.perplexity.ai https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // Rate limiting for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const key = getRateLimitKey(req);
    if (!checkRateLimit(key)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        { status: 429 }
      );
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|icon-|apple-touch|sw.js|manifest.json).*)"],
};
