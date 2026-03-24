import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface StudentWallet {
  walletAddress: string;
  ENS: string;
}

interface Student {
  Wallet: StudentWallet[];
}

interface DAO {
  Name: string;
  DAOTreasury: string;
}

interface WalletResponse {
  walletAddress: string;
  ENS: string;
}

export async function GET(req: NextRequest) {
  // Get access token from header
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
    return new Response(
      JSON.stringify({ success: false, error: "Invalid user" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  const userUID = user.id;

  const { data: student, error: studentError } = await supabaseAdmin
    .from("Student")
    .select("CourseID")
    .eq("UID", userUID)
    .single();

  if (studentError) throw studentError;

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
  // Get the class wallets from students
  const classWallets: string[] = students
    .flatMap((student) => student.Wallet || [])
    .map((wallet) => wallet.walletAddress.toLowerCase());

  // Gets the classes DAOS
  const { data: daos, error } = await supabaseAdmin.rpc("my_function", {
    wallets: classWallets,
  });

  if (error) throw error;
  // Flatten all wallets from all students and extract only walletAddress and ENS
  const allWallets: WalletResponse[] =
    (students as Student[])?.flatMap(
      (student) =>
        student.Wallet?.map((wallet) => ({
          walletAddress: wallet.walletAddress,
          ENS: wallet.ENS,
        })) || [],
    ) || [];

  // Add DAO treasuries with formatted names
  const daoWallets: WalletResponse[] =
    (daos as DAO[])
      ?.filter(
        (dao) =>
          typeof dao.DAOTreasury === "string" && dao.DAOTreasury.length > 0,
      )
      .map((dao) => ({
        walletAddress: dao.DAOTreasury,
        ENS: `${dao.Name} Treasury`,
      })) || [];

  // Combine both arrays
  const combinedWallets: WalletResponse[] = [...allWallets, ...daoWallets];

  return NextResponse.json(
    { wallets: combinedWallets },
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
