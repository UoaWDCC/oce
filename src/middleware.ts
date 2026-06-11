import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Main domains that should be indexed
const MAIN_DOMAINS = ["http://localhost:3000"];

// Public API routes that don't require authentication
const publicApiRoutes = [
  "/api/register",
  "/api/check-user",
  "/api/get-user-daos",
];

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute

// In-memory store for rate limiting (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetIn: RATE_LIMIT_WINDOW,
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetIn: record.resetTime - now,
  };
}

function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isDevAiTutorBypass =
    process.env.NODE_ENV === "development" &&
    request.nextUrl.pathname === "/api/ai-tutor/chat/stream" &&
    request.headers.get("Authorization") === "dev";
  const isMainDomain = MAIN_DOMAINS.includes(host);

  // Handle CORS preflight requests
  if (request.method === "OPTIONS" && isApiRoute) {
    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // CORS check for API routes
  if (isApiRoute && origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: "Forbidden", message: "Origin not allowed" },
      { status: 403 },
    );
  }

  // Create Supabase client
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // ============================================
  // Authentication - Always use getUser() for security
  // This verifies the token with Supabase Auth server
  // ============================================
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  let user = null;

  if (token) {
    // Token-based auth (for API requests with Bearer token)
    const {
      data: { user: tokenUser },
      error,
    } = await supabase.auth.getUser(token);
    if (!error && tokenUser) {
      user = tokenUser;
    }
  } else {
    // Cookie-based auth (for same-domain requests)
    // Use getUser() which verifies with Supabase Auth server
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser();
    if (!error && sessionUser) {
      user = sessionUser;
    }
  }

  // Rate limiting for API routes
  if (isApiRoute) {
    const rateLimitKey = getRateLimitKey(request, user?.id);
    const { allowed, remaining, resetIn } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      const response = NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil(resetIn / 1000),
        },
        { status: 429 },
      );

      response.headers.set("Retry-After", Math.ceil(resetIn / 1000).toString());
      response.headers.set(
        "X-RateLimit-Limit",
        MAX_REQUESTS_PER_WINDOW.toString(),
      );
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(resetIn / 1000).toString(),
      );

      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    supabaseResponse.headers.set(
      "X-RateLimit-Limit",
      MAX_REQUESTS_PER_WINDOW.toString(),
    );
    supabaseResponse.headers.set("X-RateLimit-Remaining", remaining.toString());
    supabaseResponse.headers.set(
      "X-RateLimit-Reset",
      Math.ceil(resetIn / 1000).toString(),
    );
  }

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // ============================================
  // Authentication check for protected API routes
  // ============================================
  if (isApiRoute && !isPublicApiRoute && !isDevAiTutorBypass) {
    if (!user) {
      const response = NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );

      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }
  }

  // Add CORS headers to successful response
  if (isApiRoute) {
    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
      supabaseResponse.headers.set(key, value);
    });
  }

  // ============================================
  // SEO: Add noindex header for non-main domains
  // ============================================
  if (!isMainDomain) {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Set pathname header for server components
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);
  supabaseResponse.headers.set("x-url", request.url);
  supabaseResponse.headers.set("x-host", host);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
