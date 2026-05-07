export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { MolochV3AdvTokenSummonerContract } from "@daohaus/contract-utils/src/lib/moloch-v3-adv-summoner-contract.js";
import { ethers } from "ethers";
import { createClient, supabaseAdmin } from "@/utils/supabase/server";

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

async function addDAOtoDB({ DAOID, DAOTreasury, Name, Members }) {
  const supabase = await createClient();

  const membersData = {
    members: Members.members,
    shamans: Members.shamans || [],
    governance: {
      votingPeriod: Members.governance.votingPeriod,
      gracePeriod: Members.governance.gracePeriod,
      quorum: Members.governance.quorum,
      minRetention: Members.governance.minRetention,
      sponsorThreshold: Members.governance.sponsorThreshold,
      newOffering: Members.governance.newOffering,
    },
    tokens: {
      votingTokenName: Members.tokens.votingTokenName,
      votingTokenSymbol: Members.tokens.votingTokenSymbol,
    },
  };

  const { error } = await supabase.from("DAO").insert({
    DAOID: DAOID,
    DAOTreasury: DAOTreasury,
    Name: Name,
    Members: membersData,
  });

  if (error) {
    throw new Error(`Failed to save DAO to database: ${error.message}`);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      daoName,
      votingTokenName,
      votingTokenSymbol,
      votingPeriod,
      gracePeriod,
      quorum,
      minRetention,
      sponsorThreshold,
      newOffering,
      members,
      shamans = [],
      selectedWallet,
    } = body;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No auth token provided" },
        { status: 401 },
      );
    }

    const supabase = await createClient(token); // client uses the user's token

    // Get the logged-in user
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid auth token" },
        { status: 401 },
      );
    }

    const { data: students, error } = await supabaseAdmin
      .from("Student")
      .select("Wallet");

    if (error) {
      throw new Error("Error fetching students: " + error.message);
    }

    const student = students?.find((s) => {
      if (!s.Wallet || !Array.isArray(s.Wallet)) {
        return false;
      }

      return s.Wallet.some((w) => {
        // Try both exact match and case-insensitive match
        return (
          w?.walletAddress === selectedWallet ||
          w?.walletAddress?.toLowerCase() === selectedWallet?.toLowerCase()
        );
      });
    });

    if (!student) {
      throw new Error("Student with wallet address not found");
    }

    if (!student?.Wallet || !student.Wallet[0].privateKey) {
      throw new Error("Student wallets not found");
    }

    const walletIndex = student.Wallet.findIndex(
      (w) => w.walletAddress.toLowerCase() === selectedWallet.toLowerCase(),
    );

    if (walletIndex === -1 && !student) throw new Error("Wallet not found");

    const privateKey = student.Wallet[walletIndex].privateKey;

    const signer = new ethers.Wallet(privateKey, provider);

    // Validate required fields
    if (!daoName || !votingTokenName || !votingTokenSymbol) {
      throw new Error(
        "Missing required fields: daoName, votingTokenName, or votingTokenSymbol",
      );
    }

    if (!members || members.length === 0) {
      throw new Error("At least one member is required");
    }

    // Check wallet balance
    const balance = await provider.getBalance(signer.address);

    if (balance === 0n) {
      throw new Error("Wallet has no ETH for gas fees");
    }

    const sharesRecipients = members.map((m) => m.address);
    const sharesAmounts = members.map((m) => {
      const shares = m.shares?.toString() || "0";
      return ethers.parseUnits(shares, 18);
    });

    // Handle shamans safely
    const fixedShaman = "0xcBeC02e5C8650C4bCae49700490CE900F309bD5E";
    const shamanAddresses = [
      fixedShaman,
      ...(shamans?.map((s) => s.address) || null),
    ];
    const shamanPermissions = [
      "7",
      ...(shamans?.map((s) => s.address) || null),
    ];
    // const shamanAddresses = shamans?.map((s) => s.address) || [];
    // const shamanPermissions = shamans?.map((s) => s.permission) || [];

    const lootRecipients = members.map(
      () => "0x0000000000000000000000000000000000000000",
    );
    const lootAmounts = members.map(() => ethers.parseUnits("0", 18));

    const molochV3AdvSummoner = MolochV3AdvTokenSummonerContract.create({
      networkId: "0xaa36a7",
      provider: signer,
    });

    const daoSetUpData = {
      sharesTokenName: votingTokenName,
      sharesTokenSymbol: votingTokenSymbol,
      lootTokenName: "Non-Voting Token",
      lootTokenSymbol: "NVT",
      safeAddress: "0x0000000000000000000000000000000000000000",
      tokenConfig: {
        pauseShares: "0x0000000000000000000000000000000000000000",
        pauseLoot: "0x0000000000000000000000000000000000000000",
      },
      governanceConfig: {
        voting: votingPeriod * 60,
        grace: gracePeriod * 60,
        newOffering: newOffering,
        quorum: quorum,
        sponsor: sponsorThreshold,
        minRetention: minRetention,
      },
      shamanConfig: {
        shamans: shamanAddresses,
        permissions: shamanPermissions,
      },
      sharesConfig: {
        to: sharesRecipients,
        amount: sharesAmounts,
      },
      lootConfig: {
        to: lootRecipients,
        amount: lootAmounts,
      },
      daoName: daoName,
    };

    const tx = await molochV3AdvSummoner.summonMolochV3({
      ...daoSetUpData,
    });

    const receipt = await tx.wait();

    const treasuryAddress = receipt.logs.at(-7).address;

    const lastArg = receipt.logs.at(-1).args[1];
    const daoAddress = lastArg;

    await addDAOtoDB({
      DAOID: daoAddress,
      DAOTreasury: treasuryAddress,
      Name: daoName,
      Members: {
        members,
        shamans,
        governance: {
          votingPeriod: votingPeriod,
          gracePeriod: gracePeriod,
          quorum,
          minRetention,
          sponsorThreshold,
          newOffering,
        },
        tokens: {
          votingTokenName,
          votingTokenSymbol,
        },
      },
    });

    const userUID = user.user.id;
    const { data: currentActivity } = await supabaseAdmin
      .from("StudentActivity")
      .select("DAOID")
      .eq("StudentUID", userUID)
      .single();

    // Get existing addresses or initialize empty array
    const existingAddresses = currentActivity?.DAOID?.address || [];

    // Add new address to the array (avoid duplicates)
    const updatedAddresses = existingAddresses.includes(daoAddress)
      ? existingAddresses
      : [...existingAddresses, daoAddress];

    // Update with the new array
    const { error: updateActivityError } = await supabaseAdmin
      .from("StudentActivity")
      .update({ DAOID: { address: updatedAddresses } })
      .eq("StudentUID", userUID);
    if (updateActivityError) {
      console.error("updating DAO Address :", updateActivityError);
    }

    const { error: updateIncrementError } = await supabaseAdmin.rpc(
      "increment_student_transactions",
      {
        student_uid_param: userUID,
      },
    );

    if (updateIncrementError) {
      console.error("Error incrementing transactions:", updateIncrementError);
    }

    return NextResponse.json(
      {
        success: true,
        hash: tx.hash,
        daoAddress: daoAddress,
        treasuryAddress: treasuryAddress,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        logsCount: receipt.logs?.length || 0,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
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
