/**
 * /utils/authHelper.ts
 *
 * Shared authentication helper for all API routes.
 * Reads role from AllowedUsers table instead of UserRoles.
 *
 * Usage:
 *   import { authenticateRequest } from "@/utils/authHelper";
 *
 *   const auth = await authenticateRequest(request);
 *   if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   // auth.user, auth.email, auth.role, auth.isAdmin, auth.isTutor, auth.allowedCourses
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service role client for server-side lookups
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!,
);

export interface AuthResult {
  user: User;
  email: string;
  uid: string;
  role: "admin" | "tutor" | "student";
  isAdmin: boolean;
  isTutor: boolean;
  allowedCourses: string[]; // empty for admins (they see everything)
  allowedUserUID: string | null; // UID from AllowedUsers (same as Student.UID)
}

export type AuthenticatedUserResult =
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
      user: User;
      accessToken: string;
      response?: never;
    }
  | {
      response: NextResponse;
      supabase?: never;
      user?: never;
      accessToken?: never;
    };

/**
 * Authenticate a bearer-token API request and return the user-scoped Supabase client.
 * This does not perform any role or AllowedUsers checks.
 */
export async function authenticateUser(
  request: Request,
  headers?: HeadersInit,
): Promise<AuthenticatedUserResult> {
  const accessToken = request.headers
    .get("Authorization")
    ?.replace("Bearer ", "");

  if (!accessToken) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers },
      ),
    };
  }

  const supabase = await createServerSupabaseClient(accessToken);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers },
      ),
    };
  }

  return { supabase, user, accessToken };
}

/**
 * Authenticate a request and return the user's role from AllowedUsers.
 * Returns null if the user is not authenticated.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  // Verify the token with anon client
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(token);

  if (error || !user || !user.email) return null;

  // Look up role from AllowedUsers
  const { data: allowedUser } = await supabaseAdmin
    .from("AllowedUsers")
    .select("Role, CourseIDs, UID")
    .ilike("Email", user.email)
    .single();

  if (!allowedUser) {
    // User exists in auth but not in AllowedUsers — treat as unauthorized
    return null;
  }

  const role = (allowedUser.Role || "student") as "admin" | "tutor" | "student";
  const courseIDs = Array.isArray(allowedUser.CourseIDs)
    ? allowedUser.CourseIDs
    : [];

  return {
    user,
    email: user.email,
    uid: user.id,
    role,
    isAdmin: role === "admin",
    isTutor: role === "tutor",
    allowedCourses: role === "admin" ? [] : courseIDs,
    allowedUserUID: allowedUser.UID || null,
  };
}

/**
 * Require at least tutor role. Returns auth result or null.
 */
export async function requireTutorOrAdmin(
  request: Request,
): Promise<AuthResult | null> {
  const auth = await authenticateRequest(request);
  if (!auth) return null;
  if (auth.role === "student") return null;
  return auth;
}

/**
 * Require admin role. Returns auth result or null.
 */
export async function requireAdmin(
  request: Request,
): Promise<AuthResult | null> {
  const auth = await authenticateRequest(request);
  if (!auth) return null;
  if (!auth.isAdmin) return null;
  return auth;
}

/**
 * Check if a tutor has access to a specific course.
 * Admins always have access.
 */
export function hasCoureAccess(auth: AuthResult, courseId: string): boolean {
  if (auth.isAdmin) return true;
  return auth.allowedCourses.includes(courseId);
}

/**
 * Get the supabase admin client (for use in API routes that need it).
 */
export function getAdminClient() {
  return supabaseAdmin;
}
