import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface DAO {
  DAOID: string;
  Name: string;
  DAOTreasury: string;
}

export async function GET(req: NextRequest) {
  // --- Auth ---
  const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "");
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
      { error: "Invalid user" },
      { status: 401, headers: corsHeaders },
    );
  }

  const userUID = user.id;

  // --- Get the user's class ---
  const { data: student, error: studentError } = await supabaseAdmin
    .from("Student")
    .select("CourseID, Wallet")
    .eq("UID", userUID)
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: studentError?.message || "Student not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  // --- Get all students in the same class ---
  const { data: students, error: dbError } = await supabaseAdmin
    .from("Student")
    .select("Wallet")
    .eq("CourseID", student.CourseID);

  if (dbError) {
    return NextResponse.json(
      { error: dbError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  // --- Flatten class wallets safely ---
  const classWallets: string[] = (students ?? [])
    .flatMap((s) => s.Wallet ?? [])
    .map((w) => w.walletAddress.toLowerCase());

  // --- Call RPC only if there are wallets ---
  let daos: DAO[] = [];
  if (classWallets.length > 0) {
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "get_class_daos",
      {
        wallets: classWallets, // ✅ pass array directly, let Supabase serialize as jsonb
      },
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    daos = rpcData ?? [];
  }

  // --- Return response ---
  return NextResponse.json({ daos }, { status: 200, headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
