export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET TRANSACTION HASHES FROM BLOCKCHAIN
 *
 * Accepts an array of proposalIds and returns a txHash for each one.
 * Transaction hashes are fetched from the DAO's Proposals array in Supabase.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestBody {
  daoAddress: string;
  proposalIds: number[];
}

export async function POST(request: Request) {
  try {
    const accessToken = request.headers
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

    const body = (await request.json()) as RequestBody;
    const { daoAddress, proposalIds } = body;

    if (!daoAddress) {
      return NextResponse.json(
        { error: "daoAddress is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (
      !proposalIds ||
      !Array.isArray(proposalIds) ||
      proposalIds.length === 0
    ) {
      return NextResponse.json(
        { error: "proposalIds must be a non-empty array" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data, error } = await supabase
      .from("DAO")
      .select("Proposals")
      .eq("DAOID", daoAddress)
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to fetch proposals: ${error?.message ?? "No data returned"}`,
      );
    }

    const proposals: Array<{ id: number; txHash?: string }> =
      data.Proposals ?? [];

    if (proposals.length === 0) {
      throw new Error("No proposals found for this DAO");
    }

    // Build a map of id -> txHash for O(1) lookup
    const txHashByProposalId = new Map<number, string | null>();
    for (const p of proposals) {
      txHashByProposalId.set(Number(p.id), p.txHash ?? null);
    }

    // Return a result for every requested ID
    const transactionHashes = proposalIds.map((id) => ({
      proposalId: Number(id),
      transactionHash: txHashByProposalId.get(Number(id)) ?? null,
    }));

    return NextResponse.json(
      { success: true, transactionHashes },
      { status: 200, headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error("Failed to fetch transaction hashes:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";

    return NextResponse.json(
      { error: "Failed to fetch transaction hashes", details: errorMessage },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
