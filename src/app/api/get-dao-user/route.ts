import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface WalletData {
  walletAddress: string;
  ENS: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const DAOID = searchParams.get("DAOID");

    if (!DAOID) {
      return NextResponse.json(
        { error: "DAOID missing" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get access token from headers
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
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const UID = user.id;

    // Fetch student
    const { data: student, error: studentError } = await supabase
      .from("Student")
      .select("*")
      .eq("UID", UID)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Get wallet addresses
    const userWallets: WalletData[] = student.Wallet
      ? student.Wallet.map((w: WalletData) => ({
          walletAddress: w.walletAddress.toLowerCase(),
          ENS: w.ENS,
        }))
      : [];

    const { data: daoData, error: daoError } = await supabase
      .from("DAO")
      .select("*")
      .eq("DAOID", DAOID)
      .maybeSingle();

    if (daoError) {
      console.error("DAO lookup failed:", daoError);
      return NextResponse.json(
        { error: "Failed to load DAO" },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!daoData) {
      return NextResponse.json(
        { error: "DAO not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const { data: daoGroup, error: daoGroupError } = await supabase
      .from("dao_groups")
      .select("id")
      .eq("dao_id", daoData.DAOID)
      .maybeSingle();

    if (daoGroupError) {
      console.error("DAO group lookup failed:", daoGroupError);
      return NextResponse.json(
        { error: "Failed to load DAO forum group" },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!daoGroup) {
      return NextResponse.json(
        { error: "DAO forum group not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { daoData, daoGroupId: daoGroup.id, userWallets, UID },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
