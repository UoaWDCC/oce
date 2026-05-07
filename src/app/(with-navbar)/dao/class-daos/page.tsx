"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Jazzicon from "../../../../components/jazzicons";
import {
  SquareArrowOutUpRight,
  Copy,
  Plus,
  Users,
  FileText,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useDaoSubscription } from "@/hooks/useDaoSubscription";
import { API_URL } from "@/utils/config";

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

interface GetClassDaosResponse {
  daos: DAO[];
  error?: string;
}

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

const DaoList: React.FC = () => {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createClient();

  // Request ID pattern: prevents stale requests from updating state
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchDAOs = useCallback(async (skipLoadingState = false) => {
    const currentRequestId = ++requestIdRef.current;

    if (!skipLoadingState) {
      setLoading(true);
    }
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (currentRequestId !== requestIdRef.current) {
        clearTimeout(timeoutId);
        return;
      }

      if (sessionError) {
        if (isMountedRef.current) {
          setError("Session error. Please try refreshing the page.");
          setLoading(false);
        }
        clearTimeout(timeoutId);
        return;
      }

      if (!session?.access_token) {
        if (isMountedRef.current) {
          setError("Not authenticated. Please try logging in again.");
          setLoading(false);
        }
        clearTimeout(timeoutId);
        return;
      }

      const res = await fetch(`${API_URL}/get-class-daos`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const json: GetClassDaosResponse = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch DAOs");
      }

      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        setDaos(json.daos || []);
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
          err instanceof Error ? err.message : "Failed to load DAOs";
        setError(errorMessage);
        setLoading(false);
      }
    }
  }, []);

  useDaoSubscription<DAO>(
    {
      onDaoCreated: (newDao) => {
        setDaos((prev) => [newDao, ...prev]);
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
    fetchDAOs();
  }, [fetchDAOs, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDAOs(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDAOs]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-[#5e00b2]"></div>
              <p className="text-gray-500 text-sm">Loading DAOs...</p>
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
                onClick={() => fetchDAOs()}
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
              <p className="text-[#5e00b2] font-medium text-sm mb-2">Explore</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                All Class DAOs
              </h1>
              <p className="text-gray-600 text-lg">
                Explore the DAOs created throughout the class
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

        {/* DAOs Grid */}
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
                Create your first DAO to get started with decentralized
                governance.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daos.map((dao) => (
              <div
                key={dao.DAOID}
                onClick={() => router.push(`/dao/${dao.DAOID}`)}
                className="group bg-white rounded-xl shadow-sm border border-gray-200/50 hover:shadow-lg hover:border-[#5e00b2]/20 transition-all duration-300 cursor-pointer overflow-hidden"
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

                  {/* Token Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-[#5e00b2]/10 text-[#5e00b2] text-xs font-medium rounded-md">
                      {dao.Members.tokens.votingTokenSymbol}
                    </span>
                    <span className="text-xs text-gray-500">
                      {dao.Members.tokens.votingTokenName}
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
                      <span className="text-lg font-bold text-gray-800">
                        {dao.Proposals?.length ?? 0}
                      </span>
                      <p className="text-xs text-gray-500">Proposals</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50/80 rounded-lg">
                      <Clock className="w-4 h-4 text-[#5e00b2] mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-800">
                        {getActiveProposalsCount(dao)}
                      </p>
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
