export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import abi from "../baalABI.json" assert { type: "json" };
import { createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RPC_URL = process.env.INFURA_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL, {
  name: "sepolia",
  chainId: 11155111,
});

interface DaoInfoRequest {
  daoAddress: string;
}

interface DaoInfoResponse {
  id: string;
  name: string;
  tokenAddress: string; // This will be the shares token (voting token)
  nonVotingTokenAddress?: string; // This will be the loot token (non-voting)
  chain: string;
}

export async function POST(request: Request) {
  try {
    const accessToken = request.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    const supabase = await createClient(accessToken);

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

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

    const body: DaoInfoRequest = await request.json();

    if (!body.daoAddress) {
      return NextResponse.json(
        { error: "Missing daoAddress" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Create the contract using the DAO address from the frontend
    const daoContract = new ethers.Contract(body.daoAddress, abi, provider); // read-only

    // const daoContract = new ethers.Contract(body.daoAddress, abi, signer);

    // Read token addresses
    const lootTokenAddress: string = await daoContract.lootToken();
    const shareTokenAddress: string = await daoContract.sharesToken();

    // Get DAO name if available
    let daoName = "Unknown DAO";
    try {
      daoName = await daoContract.name();
    } catch {
      console.warn("Could not fetch DAO name");
    }

    // Format response to match frontend expectations
    const result: DaoInfoResponse = {
      id: body.daoAddress,
      name: daoName,
      tokenAddress: shareTokenAddress,
      nonVotingTokenAddress: lootTokenAddress,
      chain: "sepolia",
    };

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("DAO info fetch failed:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "DAO info fetch failed", details: errorMessage },
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
