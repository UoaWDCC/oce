"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  Settings,
  FileText,
  Copy,
  SquareArrowOutUpRight,
  ChevronRight,
} from "lucide-react";
import { DAO, Proposal } from "./types";
import { createClient } from "@/utils/supabase/client";
import { API_URL } from "@/utils/config";

const supabase = createClient();

interface DaoGovernanceProps {
  dao: DAO;
  votingToken: string;
  nonVotingToken: string | null;
  isLoadingTokens: boolean;
  onTabChange: (tab: string) => void;
  cachedVotes: {
    [proposalId: number]: { votesFor: string; votesAgainst: string };
  };
  setCachedVotes: (votes: {
    [proposalId: number]: { votesFor: string; votesAgainst: string };
  }) => void;
  cachedTxHashes: { [proposalId: number]: string };
  setCachedTxHashes: (hashes: { [proposalId: number]: string }) => void;
  votesCached: boolean;
  setVotesCached: (cached: boolean) => void;
  proposals: Proposal[]; // ✅ Added: proposals from page.tsx (kept in sync by Supabase Realtime)
}

// Helper function to convert minutes to readable format
const formatTime = (minutes: number): string => {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    if (remainingHours === 0) {
      return `${days} ${days === 1 ? "day" : "days"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"}, ${remainingHours} ${remainingHours === 1 ? "hour" : "hours"}`;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    return `${hours} ${hours === 1 ? "hour" : "hours"}, ${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"}`;
  } else {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
};

// Helper function to format timestamp
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );
      return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes} minutes ago`;
    }
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};

// Helper function to get proposal type badge color
const getProposalTypeBadge = (type: string) => {
  const colors = {
    SIGNAL: "bg-blue-100 text-blue-700 border-blue-200",
    ISSUE: "bg-green-100 text-green-700 border-green-200",
    MINT_SHARES: "bg-green-100 text-green-700 border-green-200",
    UPDATE_GOV_SETTINGS: "bg-purple-100 text-purple-700 border-purple-200",
    GUILDKICK: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    colors[type as keyof typeof colors] ||
    "bg-gray-100 text-gray-700 border-gray-200"
  );
};

export default function DaoGovernance({
  dao,
  votingToken,
  nonVotingToken,
  isLoadingTokens,
  onTabChange,
  cachedVotes,
  setCachedVotes,
  cachedTxHashes,
  setCachedTxHashes,
  votesCached,
  setVotesCached,
  proposals,
}: DaoGovernanceProps) {
  const [copied, setCopied] = useState<string>("");
  const [latestProposals, setLatestProposals] = useState<Proposal[]>([]);
  const [votesLoading, setVotesLoading] = useState<boolean>(true);

  // Request ID pattern to prevent race conditions
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isInitialFetchDone = useRef(false);

  // Fetch vote counts from blockchain with rate limiting
  const fetchProposalVotes = useCallback(
    async (proposalId: number) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const res = await fetch(`${API_URL}/get-votes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            id: proposalId,
            daoAddress: dao.DAOID,
          }),
        });

        // Handle rate limiting
        if (res.status === 429) {
          console.warn(`Rate limited on get-votes for proposal ${proposalId}`);
          return null; // Return null to indicate failure
        }

        if (!res.ok) {
          return null;
        }

        const result = (await res.json()) as {
          success?: boolean;
          result?: {
            yesVotes?: string;
            noVotes?: string;
          };
        };

        const votes = result.result || {};

        return {
          yesVotes: votes.yesVotes || "0",
          noVotes: votes.noVotes || "0",
        };
      } catch (err) {
        console.error(`Error fetching votes for proposal ${proposalId}:`, err);
        return null;
      }
    },
    [dao.DAOID],
  );

  // Fetch transaction hashes from blockchain
  const fetchTransactionHashesFromBlockchain = useCallback(
    async (proposalIds: number[]): Promise<void> => {
      if (proposalIds.length === 0) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const res = await fetch(`${API_URL}/get-proposal-tx-hashes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            daoAddress: dao.DAOID,
            proposalIds,
          }),
        });

        // Handle rate limiting
        if (res.status === 429) {
          console.warn("Rate limited on get-proposal-tx-hashes");
          return;
        }

        if (!res.ok) {
          return;
        }

        const result = (await res.json()) as {
          success: boolean;
          transactionHashes?: Array<{
            proposalId: number;
            transactionHash: string | null;
          }>;
        };

        if (result.success && result.transactionHashes) {
          const txHashMap: { [key: number]: string } = {};

          result.transactionHashes.forEach((item) => {
            if (item.transactionHash) {
              txHashMap[item.proposalId] = item.transactionHash;
            }
          });

          setCachedTxHashes(txHashMap);
        }
      } catch (error) {
        console.error("Error fetching transaction hashes:", error);
      }
    },
    [dao.DAOID, setCachedTxHashes],
  );

  // ✅ Sync with proposals prop when it changes (page.tsx updates it via Supabase Realtime)
  useEffect(() => {
    if (!proposals || proposals.length === 0) return;

    const sorted = [...proposals]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 3);

    // Use vote data from Supabase directly - no cache updates here to avoid loops
    setLatestProposals(sorted);
    setVotesLoading(false);
  }, [proposals]);

  // Initial data fetch - fetch vote counts from blockchain if not in Supabase
  useEffect(() => {
    // Prevent double-fetch from React Strict Mode
    if (isInitialFetchDone.current) {
      return;
    }

    // Wait for proposals to be loaded
    if (!proposals || proposals.length === 0) {
      return;
    }

    isInitialFetchDone.current = true;

    const fetchProposalsData = async () => {
      const currentRequestId = ++requestIdRef.current;

      const sorted = [...proposals]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3);

      // Check if proposals already have vote data from Supabase (set by vote API)
      const proposalsHaveVotes = sorted.some(
        (p) => p.votesFor !== undefined || p.votesAgainst !== undefined,
      );

      if (proposalsHaveVotes || votesCached) {
        // Use vote data from Supabase or cached data - no need to fetch from blockchain
        setVotesLoading(false);
        return;
      }

      // Set initial proposals and mark loading as false immediately
      setLatestProposals(sorted);
      setVotesLoading(false);

      // Fetch vote counts from blockchain
      const proposalsWithVotes = [];
      const newCachedVotes: {
        [key: number]: { votesFor: string; votesAgainst: string };
      } = {};

      for (const proposal of sorted) {
        if (
          currentRequestId !== requestIdRef.current ||
          !isMountedRef.current
        ) {
          return;
        }

        const votes = await fetchProposalVotes(Number(proposal.id));

        if (votes) {
          newCachedVotes[Number(proposal.id)] = {
            votesFor: votes.yesVotes,
            votesAgainst: votes.noVotes,
          };

          proposalsWithVotes.push({
            ...proposal,
            votesFor: votes.yesVotes,
            votesAgainst: votes.noVotes,
          });

          // Update state incrementally as we get each vote
          if (
            isMountedRef.current &&
            currentRequestId === requestIdRef.current
          ) {
            setLatestProposals([
              ...proposalsWithVotes,
              ...sorted.slice(proposalsWithVotes.length),
            ]);
          }
        } else {
          proposalsWithVotes.push(proposal);
        }

        // Longer delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        setLatestProposals(proposalsWithVotes);
        if (Object.keys(newCachedVotes).length > 0) {
          setCachedVotes(newCachedVotes);
        }
        setVotesCached(true);

        const proposalIds = sorted.map((p) => Number(p.id));
        await fetchTransactionHashesFromBlockchain(proposalIds);
      }
    };

    fetchProposalsData();
  }, [
    dao.DAOID,
    votesCached,
    proposals,
    cachedVotes,
    fetchProposalVotes,
    fetchTransactionHashesFromBlockchain,
    setCachedVotes,
    setVotesCached,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const currentRequestId = requestIdRef.current;
    return () => {
      isMountedRef.current = false;
      // Increment to invalidate any pending requests
      if (requestIdRef.current === currentRequestId) {
        requestIdRef.current++;
      }
    };
  }, []);

  const handleCopy = async (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(textToCopy);
      setTimeout(() => setCopied(""), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Proposal Timing */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#5e00b2] to-[#7b2fd6] rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Proposal Timing
            </h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center py-2 md:py-3 border-b border-purple-100">
              <span className="text-sm md:text-base text-gray-600 font-medium">
                Voting Period
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {formatTime(dao.Members.governance.votingPeriod)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 md:py-3">
              <span className="text-sm md:text-base text-gray-600 font-medium">
                Grace Period
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {formatTime(dao.Members.governance.gracePeriod)}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Governance */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#5e00b2] to-[#7b2fd6] rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Advanced Governance
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="flex justify-between items-center py-2 md:py-3 border-b border-purple-100">
              <span className="text-xs md:text-base text-gray-600 font-medium">
                Quorum
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {dao.Members.governance.quorum}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 md:py-3 border-b border-purple-100">
              <span className="text-xs md:text-base text-gray-600 font-medium">
                Min Retention
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {dao.Members.governance.minRetention}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 md:py-3">
              <span className="text-xs md:text-sm text-gray-600 font-medium">
                Sponsor
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {dao.Members.governance.sponsorThreshold}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 md:py-3">
              <span className="text-xs md:text-base text-gray-600 font-medium">
                Offering
              </span>
              <span className="text-sm md:text-base text-gray-900 font-bold">
                {dao.Members.governance.newOffering}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Section */}
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#5e00b2] to-[#7b2fd6] rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Contracts
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* DAO Address */}
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                DAO Address
              </h3>
              {copied === dao.DAOID && (
                <span className="text-green-600 text-xs font-semibold">
                  ✓ Copied
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mt-2">
              <p className="break-all text-xs md:text-sm text-gray-600 font-mono flex-1">
                {dao.DAOID}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(dao.DAOID)}
                  className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                  title="Copy address"
                >
                  <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${dao.DAOID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                  title="View on Etherscan"
                >
                  <SquareArrowOutUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* DAO Treasury Address */}
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                DAO Treasury
              </h3>
              {copied === dao.DAOTreasury && (
                <span className="text-green-600 text-xs font-semibold">
                  ✓ Copied
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mt-2">
              <p className="break-all text-xs md:text-sm text-gray-600 font-mono flex-1">
                {dao.DAOTreasury}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(dao.DAOTreasury)}
                  className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                  title="Copy address"
                >
                  <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${dao.DAOTreasury}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                  title="View on Etherscan"
                >
                  <SquareArrowOutUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Voting Token */}
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Voting Token
              </h3>
              {copied === votingToken && (
                <span className="text-green-600 text-xs font-semibold">
                  ✓ Copied
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mt-2">
              {isLoadingTokens ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-b-2 border-[#5e00b2]"></div>
                  <span className="text-xs md:text-sm text-gray-500">
                    Loading...
                  </span>
                </div>
              ) : (
                <>
                  <p className="break-all text-xs md:text-sm text-gray-600 font-mono flex-1">
                    {votingToken || "Not available"}
                  </p>
                  {votingToken && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(votingToken)}
                        className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                        title="Copy address"
                      >
                        <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <a
                        href={`https://sepolia.etherscan.io/address/${votingToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                        title="View on Etherscan"
                      >
                        <SquareArrowOutUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Non-Voting Token */}
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Non-Voting Token
              </h3>
              {copied === nonVotingToken && (
                <span className="text-green-600 text-xs font-semibold">
                  ✓ Copied
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mt-2">
              {isLoadingTokens ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-b-2 border-[#5e00b2]"></div>
                  <span className="text-xs md:text-sm text-gray-500">
                    Loading...
                  </span>
                </div>
              ) : (
                <>
                  <p className="break-all text-xs md:text-sm text-gray-600 font-mono flex-1">
                    {nonVotingToken || "Not available"}
                  </p>
                  {nonVotingToken && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(nonVotingToken)}
                        className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                        title="Copy address"
                      >
                        <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <a
                        href={`https://sepolia.etherscan.io/address/${nonVotingToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#5e00b2] transition-colors p-1"
                        title="View on Etherscan"
                      >
                        <SquareArrowOutUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Latest Proposals Section */}
      {latestProposals.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100 mt-6 md:mt-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#5e00b2] to-[#7b2fd6] rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Latest Proposals
              </h2>
            </div>
            <button
              onClick={() => onTabChange("proposals")}
              className="text-sm text-[#5e00b2] hover:text-[#7b2fd6] font-semibold flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {latestProposals.map((proposal) => {
              const votesFor = proposal.votesFor
                ? Number(proposal.votesFor) / 10 ** 18
                : 0;
              const votesAgainst = proposal.votesAgainst
                ? Number(proposal.votesAgainst) / 10 ** 18
                : 0;
              const totalVotes = votesFor + votesAgainst;
              const forPercentage =
                totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
              const againstPercentage =
                totalVotes > 0 ? (votesAgainst / totalVotes) * 100 : 0;
              const txHash = cachedTxHashes[Number(proposal.id)];

              return (
                <div
                  key={proposal.id}
                  onClick={() => onTabChange("proposals")}
                  className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-500">
                          #{proposal.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getProposalTypeBadge(proposal.proposalType)}`}
                        >
                          {proposal.proposalType.replace(/_/g, " ")}
                        </span>
                        {proposal.executed && (
                          <span className="text-xs px-2 py-0.5 rounded-md border bg-green-50 text-green-700 border-green-200 font-medium">
                            EXECUTED
                          </span>
                        )}
                        {proposal.status && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                              proposal.status === "active"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : proposal.status === "passed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : proposal.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {proposal.status.toUpperCase()}
                          </span>
                        )}
                        {txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-[#5e00b2] transition-colors"
                            title="View on Etherscan"
                          >
                            <SquareArrowOutUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-[#5e00b2] transition-colors">
                        {proposal.title}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">
                        {proposal.description}
                      </p>

                      {/* Vote Counts with FIXED progress bar */}
                      {totalVotes > 0 ? (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">
                              For:{" "}
                              <span className="font-semibold text-green-600">
                                {votesFor.toFixed(2)}
                              </span>
                            </span>
                            <span className="text-gray-600">
                              Against:{" "}
                              <span className="font-semibold text-red-600">
                                {votesAgainst.toFixed(2)}
                              </span>
                            </span>
                          </div>
                          {/* FIXED: Progress Bar showing both green AND red */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 transition-all"
                              style={{ width: `${forPercentage}%` }}
                            ></div>
                            <div
                              className="bg-gradient-to-r from-red-500 to-red-600 h-1.5 transition-all"
                              style={{ width: `${againstPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 italic">
                            {votesLoading ? "Loading votes..." : "No votes yet"}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(proposal.timestamp)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#5e00b2] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {latestProposals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No proposals yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
