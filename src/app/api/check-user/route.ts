import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing environment variables!");
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Server configuration error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const body = await request.json();
    const { email, course } = body as { email?: string; course?: string };

    if (!email) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Email is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!course) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Course Code is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const courseCode = course.toUpperCase();

    // CourseIDs is a text[] array column — use .contains() to check membership
    const { data, error } = await supabase
      .from("AllowedUsers")
      .select("Email, CourseIDs")
      .ilike("Email", email)
      .contains("CourseIDs", [courseCode])
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({
          allowed: false,
          message: error.message,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(JSON.stringify({ allowed: data !== null }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Caught error:", err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return new Response(JSON.stringify({ allowed: false, message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
