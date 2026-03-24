import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface WalletData {
  walletAddress: string;
}

interface DAOMember {
  address: string;
  shares: string;
  loot: string;
}

interface DAOShaman {
  address: string;
  permission: number;
}

interface DAOMembers {
  members: DAOMember[];
  shamans?: DAOShaman[];
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposalType: string;
  timestamp: string;
}

interface DAORecord {
  DAOID: string;
  Name: string;
  Members: DAOMembers;
  Proposals: Proposal[];
}

export async function GET(req: NextRequest) {
  try {
    // Get access token from headers (optional, if using supabase auth)
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    const supabase = await createClient(accessToken);

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: "Session error", authenticated: false },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No session found", authenticated: false },
        { status: 401 },
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
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get wallet addresses
    const userWalletAddresses: string[] = student.Wallet
      ? student.Wallet.map((w: WalletData) => w.walletAddress.toLowerCase())
      : [];

    if (userWalletAddresses.length === 0) {
      return NextResponse.json({ student, daos: [] });
    }

    // Fetch all DAOs
    const { data: allDAOs, error: daoError } = await supabase
      .from("DAO")
      .select("*");
    if (daoError) {
      return NextResponse.json(
        { error: "Error fetching DAOs" },
        { status: 500 },
      );
    }

    // Filter DAOs where user is a member or shaman
    const userDAOs = (allDAOs || []).filter((dao: DAORecord) => {
      if (!dao.Members || !dao.Members.members) return false;

      const isMember = dao.Members.members.some((member: DAOMember) =>
        userWalletAddresses.includes(member.address.toLowerCase()),
      );

      const isShaman =
        dao.Members.shamans &&
        dao.Members.shamans.some((shaman: DAOShaman) =>
          userWalletAddresses.includes(shaman.address.toLowerCase()),
        );

      return isMember || isShaman;
    });

    return NextResponse.json({ student, daos: userDAOs });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
