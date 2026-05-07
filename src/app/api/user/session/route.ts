import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface WalletInfo {
  walletNum?: number;
  publicAddress: string;
  ENS: string;
  privateKey?: string;
}

interface RawWalletData {
  walletAddress: string;
  ENS: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user - this verifies with Supabase Auth server
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Auth error:", userError);
      return NextResponse.json(
        { error: "Auth error", authenticated: false },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No user found", authenticated: false },
        { status: 401 },
      );
    }

    const email = user.email;
    const UID = user.id;

    const { data: studentData, error } = await supabase
      .from("Student")
      .select("Wallet")
      .eq("UID", UID)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Database error", authenticated: false },
        { status: 500 },
      );
    }

    // Ensure Wallet exists and is an array, then strip private keys
    const walletData: WalletInfo[] = Array.isArray(studentData?.Wallet)
      ? studentData.Wallet.map((w: RawWalletData) => ({
          publicAddress: w.walletAddress,
          ENS: w.ENS,
        }))
      : [];

    return NextResponse.json({
      authenticated: true,
      registered: true,
      email: email,
      UID: UID,
      walletData: walletData,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", authenticated: false },
      { status: 500 },
    );
  }
}
