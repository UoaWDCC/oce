"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Jazzicon from "../../../components/jazzicons";
import { API_URL } from "@/utils/config";
import {
  SquareArrowOutUpRight,
  Copy,
  Plus,
  Users,
  FileText,
  Clock,
  ChevronRight,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Types based on your database schema
interface StudentInfo {
  Email: string;
  UID: string;
  Wallet: WalletInfo[] | null;
}

interface WalletInfo {
  walletAddress: string;
  ENS: string;
}

interface DAO {
  DAOID: string;
  Name: string;
  Members: {
    members: Array<{
      address: string;
      shares: string;
      loot: string;
    }>;
    shamans: Array<{
      address: string;
      permission: number;
    }>;
    governance: {
      votingPeriod: number;
      gracePeriod: number;
      quorum: number;
      minRetention: number;
      sponsorThreshold: number;
      newOffering: number;
    };
    tokens: {
      votingTokenName: string;
      votingTokenSymbol: string;
    };
  };
}

const DaoList: React.FC = () => {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StudentInfo | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchCurrentUserAndDAOs = useCallback(async () => {
    setLoading(true);

    try {
      // First verify user with getUser()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No authenticated user");
        router.push("/login");
        return;
      }

      // Then get session for access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        console.error("No access token found");
        router.push("/login");
        return;
      }

      const res = await fetch(
        `${API_URL}/get-user-daos`,

        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data: { student: StudentInfo; daos: DAO[]; error?: string } =
        await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch user DAOs");

      setCurrentUser(data.student);
      setDaos(data.daos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchCurrentUserAndDAOs();
  }, [fetchCurrentUserAndDAOs]);

  const handleCopy = async (daoId: string) => {
    try {
      await navigator.clipboard.writeText(daoId);
      setCopiedId(daoId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isUserShaman = (dao: DAO): boolean => {
    if (!currentUser?.Wallet || !dao.Members.shamans) return false;

    const userWalletAddresses = currentUser.Wallet.map((wallet) =>
      wallet.walletAddress.toLowerCase(),
    );

    return dao.Members.shamans.some((shaman) =>
      userWalletAddresses.includes(shaman.address.toLowerCase()),
    );
  };

  const getUserRole = (dao: DAO): string => {
    if (isUserShaman(dao)) return "Shaman";
    return "Member";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-[#5e00b2]"></div>
              <p className="text-gray-500 text-sm">Loading your DAOs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-[#5e00b2] font-medium text-sm mb-2">
                Dashboard
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                Your DAOs
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and explore your decentralized organizations
              </p>
            </div>

            <Link href="/dao/create">
              <button className="inline-flex items-center px-5 py-2.5 bg-[#5e00b2] text-white font-medium rounded-lg hover:bg-[#4a0090] transition-all duration-200 shadow-sm hover:shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Create DAO
              </button>
            </Link>
          </div>
        </div>

        {daos.length === 0 ? (
          /* Empty State */
          <div className="flex justify-center py-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-10 max-w-md text-center">
              <div className="w-16 h-16 bg-[#5e00b2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-[#5e00b2]" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                No DAOs Yet
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {currentUser?.Wallet && currentUser.Wallet.length > 0
                  ? "You haven't joined any DAOs yet. Create one or ask to be added to an existing DAO."
                  : "Create a wallet first, then create or join a DAO to get started with decentralized governance."}
              </p>
              <Link href="/dao/create">
                <button className="inline-flex items-center px-5 py-2.5 bg-[#5e00b2] text-white font-medium rounded-lg hover:bg-[#4a0090] transition-all duration-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First DAO
                </button>
              </Link>
            </div>
          </div>
        ) : (
          /* DAO Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daos.map((dao) => (
              <div
                key={dao.DAOID}
                onClick={() => router.push(`/dao/${dao.DAOID}`)}
                className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 hover:shadow-lg hover:border-[#5e00b2]/20 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-[#5e00b2]/20 transition-all">
                        <Jazzicon address={dao.DAOID} diameter={48} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#5e00b2] transition-colors">
                          {dao.Name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-mono">
                            {truncateAddress(dao.DAOID)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(dao.DAOID);
                            }}
                            className="relative p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-gray-400 hover:text-[#5e00b2]" />
                            {copiedId === dao.DAOID && (
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Copied!
                              </span>
                            )}
                          </button>
                          <Link
                            href={`https://sepolia.etherscan.io/address/${dao.DAOID}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <SquareArrowOutUpRight className="w-3 h-3 text-gray-400 hover:text-[#5e00b2]" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                        isUserShaman(dao)
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {getUserRole(dao)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {dao.Members.tokens.votingTokenSymbol}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg">
                      <Users className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">
                        {dao.Members.members.length}
                      </p>
                      <p className="text-xs text-gray-500">Members</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg">
                      <FileText className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">0</p>
                      <p className="text-xs text-gray-500">Proposals</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg">
                      <Clock className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">0</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Quorum: {dao.Members.governance.quorum}%</span>
                    <span>Vote: {dao.Members.governance.votingPeriod}m</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#5e00b2] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DaoList;
