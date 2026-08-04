"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams } from "next/navigation";
import DaoHeader from "./daoHeader";
import DaoGovernance from "./governance";
import DaoMembers from "./members";
import { DAO, WalletInfo, Proposal } from "./types";
import ProposalCreation from "./proposalCreation";
import Proposals from "./proposals";
import DaoForum from "./forum";
import { API_URL } from "@/utils/config";
import { useProposalSubscription } from "@/hooks/useProposalSubscription";

// Create singleton Supabase client outside component
const supabase = createClient();

interface UserInfo {
  Wallet: WalletInfo[];
  UID: string;
}

interface GetDaoUserResponse {
  daoData: DAO;
  daoGroupId: string;
  userWallets: WalletInfo[];
  UID: string;
}

type TabType = "overview" | "proposals" | "members" | "forum";

interface UserVoteChoice {
  hasVoted: boolean;
  voteChoice?: boolean;
}

interface DaohausApiResponse {
  id: string;
  name: string;
  tokenAddress: string;
  nonVotingTokenAddress?: string;
  votingTokenName?: string;
  votingTokenSymbol?: string;
  nonVotingTokenName?: string;
  nonVotingTokenSymbol?: string;
  Proposals: Proposal[];
  safeAddress: string;
  chain: string;
}

export default function DaoDetailsPage() {
  const { DAOID } = useParams<{ DAOID: string }>();
  const [dao, setDao] = useState<DAO | null>(null);
  const [daoGroupId, setDaoGroupId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [votingToken, setVotingToken] = useState<string>("");
  const [nonVotingToken, setNonVotingToken] = useState<string | null>(null);
  const [votingTokenName, setVotingTokenName] = useState<string>("");
  const [votingTokenSymbol, setVotingTokenSymbol] = useState<string>("");
  const [nonVotingTokenName, setNonVotingTokenName] = useState<string>("");
  const [nonVotingTokenSymbol, setNonVotingTokenSymbol] = useState<string>("");
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState<boolean>(true);

  // ✅ Lift vote caching to page.tsx so it persists across tab switches
  const [cachedVotes, setCachedVotes] = useState<{
    [proposalId: number]: { votesFor: string; votesAgainst: string };
  }>({});
  const [cachedTxHashes, setCachedTxHashes] = useState<{
    [proposalId: number]: string;
  }>({});
  const votesCachedRef = useRef<boolean>(false);

  // ✅ Lift userVotes to page.tsx so it persists across tab switches
  const [userVotes, setUserVotes] = useState<{
    [proposalId: number]: UserVoteChoice;
  }>({});

  const fetchDAOAndUser = useCallback(async () => {
    if (!DAOID) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      const res = await fetch(`${API_URL}/get-dao-user?DAOID=${DAOID}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data: GetDaoUserResponse = await res.json();
      setDao(data.daoData);
      setDaoGroupId(
        typeof data.daoGroupId === "string" ? data.daoGroupId : null,
      );

      const user: UserInfo = {
        UID: data.UID,
        Wallet: data.userWallets,
      };

      setCurrentUser(user);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [DAOID]);

  useEffect(() => {
    fetchDAOAndUser();
  }, [fetchDAOAndUser]);

  // ✅ Subscribe to Supabase Realtime at the PAGE level (persists across tab switches)
  useProposalSubscription<Proposal>(
    dao?.DAOID,
    {
      onProposalsUpdated: (updatedProposals) => {
        // Update proposals state - this will propagate to all child components
        setProposals(updatedProposals);

        // Also update cachedVotes with the new vote data from Supabase
        const newCachedVotes: {
          [key: number]: { votesFor: string; votesAgainst: string };
        } = {};
        updatedProposals.forEach((proposal) => {
          if (
            proposal.votesFor !== undefined ||
            proposal.votesAgainst !== undefined
          ) {
            newCachedVotes[Number(proposal.id)] = {
              votesFor: String(proposal.votesFor || "0"),
              votesAgainst: String(proposal.votesAgainst || "0"),
            };
          }
        });
        if (Object.keys(newCachedVotes).length > 0) {
          setCachedVotes((prev) => ({ ...prev, ...newCachedVotes }));
        }
      },
    },
    !!dao?.DAOID,
  );

  // Fetch token addresses from DAOhaus API
  useEffect(() => {
    const fetchTokenAddresses = async () => {
      if (!dao?.DAOID) return;

      setIsLoadingTokens(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("No access token found");
        }

        const res = await fetch(`${API_URL}/getDaoInfo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ daoAddress: dao.DAOID }),
        });

        if (!res.ok) {
          const errorBody = (await res.json().catch(() => null)) as {
            error?: string;
            details?: string;
          } | null;
          throw new Error(
            errorBody?.details ??
              errorBody?.error ??
              `Failed to fetch DAO info: ${res.status}`,
          );
        }

        const data = (await res.json()) as DaohausApiResponse;

        setVotingToken(data.tokenAddress);
        setNonVotingToken(data.nonVotingTokenAddress || null);

        // Set token names and symbols if available
        setVotingTokenName(data.votingTokenName || "");
        setVotingTokenSymbol(data.votingTokenSymbol || "");
        setNonVotingTokenName(data.nonVotingTokenName || "");
        setNonVotingTokenSymbol(data.nonVotingTokenSymbol || "");
      } catch (err) {
        console.error("Error fetching token addresses:", err);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokenAddresses();
  }, [dao?.DAOID]);

  // Fetch proposals once when component mounts
  useEffect(() => {
    const fetchProposals = async () => {
      if (!dao?.DAOID) return;

      setProposalsLoading(true);
      try {
        const { data, error } = await supabase
          .from("DAO")
          .select("Proposals")
          .eq("DAOID", dao.DAOID)
          .single();

        if (error) {
          console.error("Failed to fetch proposals:", error.message);
        } else {
          const proposalsData = Array.isArray(data?.Proposals)
            ? data.Proposals
            : [];
          setProposals(proposalsData);
        }
      } catch (err) {
        console.error("An unexpected error occurred:", err);
      } finally {
        setProposalsLoading(false);
      }
    };

    fetchProposals();
  }, [dao?.DAOID]);

  const handleCopy = async () => {
    if (!DAOID) return;
    await navigator.clipboard.writeText(DAOID);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5e00b2]"></div>
      </div>
    );

  if (!dao)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <p className="text-red-600 font-semibold">DAO not found</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-4 md:py-10">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 sm:p-6 md:p-8 mb-4 md:mb-6">
          <DaoHeader
            dao={dao}
            copied={copied}
            handleCopy={handleCopy}
            truncateAddress={truncateAddress}
            votingToken={votingToken}
            nonVotingToken={nonVotingToken}
            votingTokenName={votingTokenName}
            votingTokenSymbol={votingTokenSymbol}
            nonVotingTokenName={nonVotingTokenName}
            nonVotingTokenSymbol={nonVotingTokenSymbol}
            isLoadingTokens={isLoadingTokens}
          />

          {/* Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <nav className="flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-3 sm:pb-4 px-2 font-bold transition-colors relative whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "overview"
                    ? "text-[#5e00b2] border-b-4 border-[#5e00b2]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("proposals")}
                className={`pb-3 sm:pb-4 px-2 font-bold transition-colors relative whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "proposals"
                    ? "text-[#5e00b2] border-b-4 border-[#5e00b2]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Proposals
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`pb-3 sm:pb-4 px-2 font-bold transition-colors relative whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "members"
                    ? "text-[#5e00b2] border-b-4 border-[#5e00b2]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Members
              </button>
              <button
                onClick={() => setActiveTab("forum")}
                className={`pb-3 sm:pb-4 px-2 font-bold transition-colors relative whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "forum"
                    ? "text-[#5e00b2] border-b-4 border-[#5e00b2]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Forum
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 sm:p-6 md:p-8">
          {activeTab === "overview" && (
            <div>
              <DaoGovernance
                dao={dao}
                votingToken={votingToken}
                nonVotingToken={nonVotingToken}
                isLoadingTokens={isLoadingTokens}
                onTabChange={(tab) => setActiveTab(tab as TabType)}
                cachedVotes={cachedVotes}
                setCachedVotes={setCachedVotes}
                cachedTxHashes={cachedTxHashes}
                setCachedTxHashes={setCachedTxHashes}
                votesCached={votesCachedRef.current}
                setVotesCached={(cached) => {
                  votesCachedRef.current = cached;
                }}
                proposals={proposals}
              />
            </div>
          )}
          {activeTab === "proposals" && (
            <div>
              <ProposalCreation daoData={dao} currentUser={currentUser} />
              <Proposals
                dao={dao}
                proposals={proposals}
                setProposals={setProposals}
                proposalsLoading={proposalsLoading}
                userVotes={userVotes}
                setUserVotes={setUserVotes}
              />
            </div>
          )}
          {activeTab === "members" && (
            <DaoMembers dao={dao} truncateAddress={truncateAddress} />
          )}
          {activeTab === "forum" &&
            (daoGroupId ? (
              <DaoForum dao={dao} daoGroupId={daoGroupId} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                This DAO does not have a forum group yet.
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}
