/**
 * /api/register/route.ts
 *
 * Updated registration flow:
 *   1. Check AllowedUsers for the user's email
 *   2. If not found → reject (must be pre-approved)
 *   3. Create Student row, StudentActivity row, EULA acceptance
 *   4. Set UID on AllowedUsers to link the account
 *   5. If course provided and not in their CourseIDs, add it
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PostRequestBody {
  uuid?: string;
  course?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: PostRequestBody = await request.json();
    const { uuid, course } = body;

    if (!uuid) {
      return new Response(
        JSON.stringify({ success: false, message: "UUID missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
    if (!course) {
      return new Response(
        JSON.stringify({ success: false, message: "Course Code is missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const courseCode = course.toUpperCase();

    // Step 1: Look up the user's email from auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(uuid);

    if (authError || !authUser?.user?.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Could not find user in auth",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const userEmail = authUser.user.email.toLowerCase();

    // Step 2: Check AllowedUsers for this email
    const { data: allowedUser, error: allowedError } = await supabaseAdmin
      .from("AllowedUsers")
      .select("Email, Role, CourseIDs, UID")
      .ilike("Email", userEmail)
      .single();

    if (allowedError || !allowedUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "You are not on the approved list. Contact your tutor or admin.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Step 3: Check if already registered (UID already set)
    if (allowedUser.UID) {
      // Already registered — just ensure course is in their list
      const currentCourses = Array.isArray(allowedUser.CourseIDs)
        ? allowedUser.CourseIDs
        : [];

      if (!currentCourses.includes(courseCode)) {
        await supabaseAdmin
          .from("AllowedUsers")
          .update({ CourseIDs: [...currentCourses, courseCode] })
          .ilike("Email", userEmail);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Already registered" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Step 4: Create Student row
    const { error: studentError } = await supabaseAdmin
      .from("Student")
      .insert({ UID: uuid, CourseID: courseCode });

    if (studentError) {
      // If duplicate key, student already exists — that's ok
      if (studentError.code !== "23505") {
        return new Response(
          JSON.stringify({ success: false, message: studentError.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    // Step 5: Create StudentActivity row
    const { error: activityError } = await supabaseAdmin
      .from("StudentActivity")
      .insert({ StudentUID: uuid });

    if (activityError && activityError.code !== "23505") {
      console.error("StudentActivity insert error:", activityError);
      // Non-critical — don't block registration
    }

    // Step 6: Create EULA acceptance
    const { error: eulaError } = await supabaseAdmin
      .from("user_eula_acceptances")
      .insert({ UID: uuid, version_no: "1.0" });

    if (eulaError && eulaError.code !== "23505") {
      console.error("EULA insert error:", eulaError);
    }

    // Step 7: Update AllowedUsers — set UID and ensure course is in CourseIDs
    const currentCourses = Array.isArray(allowedUser.CourseIDs)
      ? allowedUser.CourseIDs
      : [];

    const updatedCourses = currentCourses.includes(courseCode)
      ? currentCourses
      : [...currentCourses, courseCode];

    const { error: updateError } = await supabaseAdmin
      .from("AllowedUsers")
      .update({
        UID: uuid,
        CourseIDs: updatedCourses,
      })
      .ilike("Email", userEmail);

    if (updateError) {
      console.error("AllowedUsers UID update error:", updateError);
      // Non-critical — registration still succeeded
    }

    return new Response(
      JSON.stringify({ success: true, message: "Registration successful" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: "Register API is live" }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
