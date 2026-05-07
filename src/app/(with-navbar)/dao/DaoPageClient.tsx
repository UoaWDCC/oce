"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  Info,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useDaoSubscription } from "@/hooks/useDaoSubscription";

// Tooltip Component
const InfoTooltip = ({
  content,
  position = "top",
}: {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 288;
    const tooltipHeight = 80;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = rect.top - tooltipHeight - 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 8;
        break;
    }

    setCoords({ top, left });
    setIsVisible(true);
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800",
    right:
      "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-help">
        <Info
          className={`w-3.5 h-3.5 transition-colors ${isVisible ? "text-[#5e00b2]" : "text-gray-400"}`}
        />
      </div>
      {isVisible &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[99999] pointer-events-none"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="bg-gray-800 text-white text-sm px-4 py-3 rounded-lg shadow-lg w-72 whitespace-normal leading-relaxed">
              {content}
              <div
                className={`absolute ${arrowClasses[position]} border-4 w-0 h-0`}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// Types
interface StudentInfo {
  Email: string;
  UID?: string;
  Wallet: WalletInfo[] | null;
}

interface WalletInfo {
  walletAddress: string;
  ENS?: string;
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
  Proposals?: Array<{
    id: string;
    title: string;
    description: string;
    proposalType: string;
    timestamp: string;
  }>;
}

export default function DaoPageClient() {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StudentInfo | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const supabase = createClient();

  // Request ID pattern: prevents stale requests from updating state
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchCurrentUserAndDAOs = useCallback(
    async (skipLoadingState = false) => {
      const currentRequestId = ++requestIdRef.current;

      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (currentRequestId !== requestIdRef.current) {
          clearTimeout(timeoutId);
          return;
        }

        if (userError) {
          if (isMountedRef.current) {
            setError("Authentication error. Please try logging in again.");
            setLoading(false);
          }
          clearTimeout(timeoutId);
          return;
        }

        if (!user) {
          clearTimeout(timeoutId);
          router.push("/login");
          return;
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (currentRequestId !== requestIdRef.current) {
          clearTimeout(timeoutId);
          return;
        }

        if (sessionError) {
          if (isMountedRef.current) {
            setError("Session error. Please try logging in again.");
            setLoading(false);
          }
          clearTimeout(timeoutId);
          return;
        }

        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          clearTimeout(timeoutId);
          router.push("/login");
          return;
        }

        const res = await fetch(`${API_URL}/get-user-daos`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (!res.ok) {
          const errorData = (await res
            .json()
            .catch(() => ({ error: "Unknown error" }))) as { error?: string };
          throw new Error(
            errorData.error || `Failed to fetch user DAOs (${res.status})`,
          );
        }

        const data: { student: StudentInfo; daos: DAO[]; error?: string } =
          await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (currentRequestId === requestIdRef.current && isMountedRef.current) {
          setCurrentUser(data.student);
          setDaos(data.daos || []);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof Error && err.name === "AbortError") {
          if (isMountedRef.current) {
            setError("Request timed out. Please try again.");
            setLoading(false);
          }
          return;
        }

        if (isMountedRef.current) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to load DAOs. Please try again.";
          setError(errorMessage);
          setLoading(false);
        }
      }
    },
    [router],
  );

  useDaoSubscription<DAO>(
    {
      onDaoCreated: () => {
        fetchCurrentUserAndDAOs(true);
      },
      onDaoUpdated: (updatedDao) => {
        setDaos((prev) =>
          prev.map((dao) =>
            dao.DAOID === updatedDao.DAOID ? updatedDao : dao,
          ),
        );
      },
      onDaoDeleted: (daoId) => {
        setDaos((prev) => prev.filter((dao) => dao.DAOID !== daoId));
      },
    },
    true,
  );

  useEffect(() => {
    fetchCurrentUserAndDAOs();
  }, [fetchCurrentUserAndDAOs, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCurrentUserAndDAOs(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCurrentUserAndDAOs]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestIdRef.current++;
    };
  }, []);

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

  const getActiveProposalsCount = (dao: DAO): number => {
    if (!dao.Proposals || dao.Proposals.length === 0) return 0;

    const now = Date.now();

    return dao.Proposals.filter((proposal) => {
      const proposalTimestamp = Number(proposal.timestamp);
      const votingPeriodMs = dao.Members.governance.votingPeriod * 60 * 1000;
      const gracePeriodMs = dao.Members.governance.gracePeriod * 60 * 1000;
      const totalPeriodMs = votingPeriodMs + gracePeriodMs;
      const expiryTime = proposalTimestamp + totalPeriodMs;

      return now < expiryTime;
    }).length;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-10 max-w-md text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Error Loading DAOs
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <button
                onClick={() => fetchCurrentUserAndDAOs()}
                className="inline-flex items-center px-5 py-2.5 bg-[#5e00b2] text-white font-medium rounded-lg hover:bg-[#4a0090] transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  Your DAOs
                </h1>
                <div className="mb-2">
                  <InfoTooltip
                    content="DAOs (Decentralized Autonomous Organizations) are blockchain-based entities where rules are encoded in smart contracts. Your wallet address determines your membership and voting power."
                    position="right"
                  />
                </div>
              </div>
              <p className="text-gray-600 text-lg">
                Manage and explore your decentralized organizations
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dao/create">
                <button className="inline-flex items-center px-5 py-2.5 bg-[#5e00b2] text-white font-medium rounded-lg hover:bg-[#4a0090] transition-all duration-200 shadow-sm hover:shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Create DAO
                </button>
              </Link>
              <InfoTooltip
                content="Deploys a new DAO smart contract to the Sepolia testnet. This creates governance tokens, sets voting rules, and registers you as the initial Shaman (admin) with full permissions."
                position="bottom"
              />
            </div>
          </div>
        </div>

        {daos.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-10 max-w-md text-center">
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
              <div className="flex items-center justify-center gap-2">
                <Link href="/dao/create">
                  <button className="inline-flex items-center px-5 py-2.5 bg-[#5e00b2] text-white font-medium rounded-lg hover:bg-[#4a0090] transition-all duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First DAO
                  </button>
                </Link>
                <InfoTooltip
                  content="This will deploy a new Moloch-style DAO smart contract. You'll configure voting periods, quorum requirements, and become the founding Shaman with administrative privileges."
                  position="right"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daos.map((dao) => (
              <div
                key={dao.DAOID}
                onClick={() => router.push(`/dao/${dao.DAOID}`)}
                className="group bg-white rounded-xl shadow-sm border border-gray-200/50 hover:shadow-lg hover:border-[#5e00b2]/20 transition-all duration-300 cursor-pointer"
              >
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
                            className="relative p-1 hover:bg-gray-100 rounded transition-colors group/copy"
                          >
                            <Copy className="w-3 h-3 text-gray-400 hover:text-[#5e00b2]" />
                            {copiedId === dao.DAOID && (
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Copied!
                              </span>
                            )}
                          </button>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center"
                          >
                            <Link
                              href={`https://sepolia.etherscan.io/address/${dao.DAOID}`}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <SquareArrowOutUpRight className="w-3 h-3 text-gray-400 hover:text-[#5e00b2]" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <InfoTooltip
                        content="This is the DAO's smart contract address on Sepolia testnet. Click the external link to view all transactions and contract interactions on Etherscan."
                        position="bottom"
                      />
                    </div>
                  </div>

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
                    <div onClick={(e) => e.stopPropagation()}>
                      <InfoTooltip
                        content={
                          isUserShaman(dao)
                            ? "Shamans have admin privileges and can mint/burn shares, add members, and manage the DAO without proposals. This role is stored on-chain."
                            : "Members hold voting shares and can create/vote on proposals. Your voting power is proportional to your shares stored in the smart contract."
                        }
                        position="bottom"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg relative group/stat">
                      <Users className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">
                        {dao.Members.members.length}
                      </p>
                      <p className="text-xs text-gray-500">Members</p>
                      <div
                        className="absolute top-1 right-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InfoTooltip
                          content="Wallet addresses that hold voting shares in this DAO. Each member's shares are tracked on-chain and determine their voting weight."
                          position="right"
                        />
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg relative">
                      <FileText className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <span className="text-lg font-bold text-gray-800">
                        {dao.Proposals?.length ?? 0}
                      </span>
                      <p className="text-xs text-gray-500">Proposals</p>
                      <div
                        className="absolute top-1 right-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InfoTooltip
                          content="On-chain proposals for DAO actions like adding members, transferring funds, or changing settings. Each proposal goes through voting and grace periods."
                          position="bottom"
                        />
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg relative">
                      <Clock className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">
                        {getActiveProposalsCount(dao)}
                      </p>
                      <p className="text-xs text-gray-500">Active</p>
                      <div
                        className="absolute top-1 right-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InfoTooltip
                          content="Proposals currently in voting or grace period. Calculated from on-chain timestamps against the DAO's configured voting/grace periods."
                          position="left"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 rounded-b-xl flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>Quorum: {dao.Members.governance.quorum}%</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <InfoTooltip
                          content="Minimum percentage of total shares that must vote 'Yes' for a proposal to pass. This threshold is enforced by the smart contract."
                          position="top"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Vote: {dao.Members.governance.votingPeriod}m</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <InfoTooltip
                          content="Duration (in minutes) that members have to cast votes on proposals. After this period, votes are tallied on-chain."
                          position="top"
                        />
                      </div>
                    </div>
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
}
