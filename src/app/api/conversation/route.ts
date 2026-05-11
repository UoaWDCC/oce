import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Conversation {
  id: string;
  StudentUID: string;
  CreatedAt: string;
}

// GET /api/conversation
// Gets the latest/current conversation for this user
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const { data: conversation, error } = (await supabase
      .from("Conversation")
      .select("*")
      .eq("StudentUID", user.id)
      .order("CreatedAt", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: Conversation | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { conversation },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("GET /api/conversation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// POST /api/conversation
// Creates a new conversation
// Also used for reset
export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const { data: conversation, error } = (await supabase
      .from("Conversation")
      .insert({
        StudentUID: user.id,
      })
      .select("*")
      .single()) as { data: Conversation; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { conversation },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error("POST /api/conversation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Handles browser preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
