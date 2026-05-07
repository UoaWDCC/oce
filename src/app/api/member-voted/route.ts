export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ethers, Contract } from "ethers";
import abi from "../baalABI.json" assert { type: "json" };

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

interface CheckVoteRequest {
  id: number;
  walletAddress: string;
  daoAddress: string;
}
interface CheckVote {
  id: number;
  walletAddress: string;
  daoContract: Contract;
}

const checkMemberVote = async (voteData: CheckVote) => {
  try {
    const { id, walletAddress, daoContract } = voteData;

    const memberVote = await daoContract.memberVoted(walletAddress, id);

    return {
      success: true,
      memberVote: memberVote,
    };
  } catch (error) {
    console.error("Error submitting proposal:", error);
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const body: CheckVoteRequest = await request.json();

    const { id, walletAddress, daoAddress } = body;

    const daoContract: Contract = new ethers.Contract(
      daoAddress,
      abi,
      provider,
    );

    const voteData: CheckVote = {
      id,
      walletAddress,
      daoContract,
    };

    const result = await checkMemberVote(voteData);

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("Vote submission failed:", err);
    const errorMessage =
      err instanceof Error ? err.message : "unknown error occured";
    return NextResponse.json(
      { error: "Vote submission failed", details: errorMessage },
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
