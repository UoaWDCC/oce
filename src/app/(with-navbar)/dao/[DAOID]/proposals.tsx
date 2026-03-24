// "use client";
// import { useEffect, useState, useCallback, useRef } from "react";
// import { createClient } from "@/utils/supabase/client";
// import { DAO, VoteRequest, CheckVoteResponse, Proposal } from "./types";
// import { API_URL } from "@/utils/config";

// const supabase = createClient();

// // Extended Proposal type with computed fields for UI display
// interface ProposalWithComputed extends Proposal {
//   endTime?: number;
//   graceEndTime?: number;
//   quorum?: number;
//   computedStatus?: "active" | "passed" | "rejected" | "grace" | "expired";
// }

// interface UserVoteChoice {
//   hasVoted: boolean;
//   voteChoice?: boolean;
// }

// interface DaoGovernanceProps {
//   dao: DAO;
//   proposals: Proposal[];
//   setProposals: React.Dispatch<React.SetStateAction<Proposal[]>>;
//   proposalsLoading: boolean;
//   userVotes: { [proposalId: number]: UserVoteChoice };
//   setUserVotes: React.Dispatch<
//     React.SetStateAction<{ [proposalId: number]: UserVoteChoice }>
//   >;
// }

// interface CheckVoteRequest {
//   id: number;
//   walletAddress: string;
//   daoAddress: string;
// }

// interface ProposalVotes {
//   yesVotes: string;
//   noVotes: string;
// }

// interface VoteResponse {
//   success: boolean;
//   message?: string;
//   transactionHash?: string;
// }

// type VotingState = "idle" | "voting" | "confirming" | "success" | "error";
// type ExecutionState = "idle" | "executing" | "executed" | "error";

// export default function ProposalsPage({
//   dao,
//   proposals,
//   setProposals,
//   proposalsLoading,
//   userVotes,
//   setUserVotes,
// }: DaoGovernanceProps) {
//   // ✅ userVotes now comes from props (persisted in page.tsx)
//   // Local state for display with computed fields (endTime, graceEndTime, etc.)
//   const [displayProposals, setDisplayProposals] = useState<
//     ProposalWithComputed[]
//   >([]);
//   const [votingStates, setVotingStates] = useState<{
//     [proposalId: number]: VotingState;
//   }>({});
//   const [voteErrors, setVoteErrors] = useState<{
//     [proposalId: number]: string;
//   }>({});
//   const [executionStates, setExecutionStates] = useState<{
//     [proposalId: number]: ExecutionState;
//   }>({});
//   const [executionErrors, setExecutionErrors] = useState<{
//     [proposalId: number]: string;
//   }>({});
//   const [blockingProposalId, setBlockingProposalId] = useState<{
//     [proposalId: number]: number | null;
//   }>({});
//   const [transactionHashes, setTransactionHashes] = useState<{
//     [proposalId: number]: string;
//   }>({});

//   // Request ID pattern to prevent race conditions
//   const requestIdRef = useRef(0);
//   const isMountedRef = useRef(true);
//   const initialFetchDone = useRef(false);
//   const voteCheckDone = useRef(false);
//   const txHashFetchDone = useRef(false);

//   const storedWallet =
//     typeof window !== "undefined"
//       ? localStorage.getItem("selectedWallet")
//       : null;

//   const shouldReturn = !storedWallet;

//   // Compute proposal status and time fields
//   const computeProposalFields = useCallback(
//     (proposal: Proposal): ProposalWithComputed => {
//       const now = new Date().getTime();

//       if (!proposal.timestamp || !dao.Members?.governance) {
//         return { ...proposal, computedStatus: "active" };
//       }

//       const voteEndTime =
//         proposal.timestamp + dao.Members.governance.votingPeriod * 60 * 1000;
//       const graceEndTime =
//         voteEndTime + dao.Members.governance.gracePeriod * 60 * 1000;
//       const quorum = dao.Members.governance.quorum;

//       let computedStatus: ProposalWithComputed["computedStatus"] = "active";

//       if (proposal.executed) {
//         computedStatus = "passed";
//       } else if (now > graceEndTime) {
//         const votesFor = Number(proposal.votesFor || "0");
//         const votesAgainst = Number(proposal.votesAgainst || "0");
//         const totalVotes = votesFor + votesAgainst;

//         if (totalVotes < quorum) {
//           computedStatus = "rejected";
//         } else if (votesFor > votesAgainst) {
//           computedStatus = "passed";
//         } else {
//           computedStatus = "rejected";
//         }
//       } else if (now <= voteEndTime) {
//         computedStatus = "active";
//       } else if (now > voteEndTime && now <= graceEndTime) {
//         computedStatus = "grace";
//       } else {
//         computedStatus = "expired";
//       }

//       return {
//         ...proposal,
//         endTime: voteEndTime,
//         graceEndTime,
//         quorum,
//         computedStatus,
//       };
//     },
//     [dao.Members?.governance],
//   );

//   // Sync displayProposals with proposals from props
//   useEffect(() => {
//     const computed = proposals.map(computeProposalFields);
//     setDisplayProposals(computed);
//   }, [proposals, computeProposalFields]);

//   const updateProposalStatuses = useCallback(() => {
//     setDisplayProposals((prevProposals) =>
//       prevProposals.map((proposal) => computeProposalFields(proposal)),
//     );
//   }, [computeProposalFields]);

//   const fetchProposalVotes = useCallback(
//     async (proposalId: number): Promise<ProposalVotes | null> => {
//       try {
//         const { data: sessionData } = await supabase.auth.getSession();
//         const accessToken = sessionData?.session?.access_token;
//         const res = await fetch(`${API_URL}/get-votes`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${accessToken}`,
//           },
//           body: JSON.stringify({
//             id: proposalId,
//             walletAddress: storedWallet,
//             daoAddress: dao.DAOID,
//           }),
//         });

//         // Handle rate limiting - return null instead of default values
//         if (res.status === 429) {
//           console.warn(`Rate limited on get-votes for proposal ${proposalId}`);
//           return null;
//         }

//         if (!res.ok) {
//           return null;
//         }

//         const data = await res.json();

//         if (
//           data &&
//           typeof data === "object" &&
//           "success" in data &&
//           data.success &&
//           "result" in data &&
//           data.result &&
//           typeof data.result === "object" &&
//           "yesVotes" in data.result &&
//           "noVotes" in data.result
//         ) {
//           return {
//             yesVotes: String(data.result.yesVotes || "0"),
//             noVotes: String(data.result.noVotes || "0"),
//           };
//         } else {
//           return { yesVotes: "0", noVotes: "0" };
//         }
//       } catch (error) {
//         console.error(
//           "Failed to fetch votes for proposal",
//           proposalId,
//           ":",
//           error,
//         );
//         return null;
//       }
//     },
//     [storedWallet, dao.DAOID],
//   );

//   const checkVote = useCallback(
//     async (proposalID: number, walletAddress: string, daoAddress: string) => {
//       try {
//         const { data: sessionData } = await supabase.auth.getSession();
//         const accessToken = sessionData?.session?.access_token;
//         const res = await fetch(`${API_URL}/member-voted`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${accessToken}`,
//           },
//           body: JSON.stringify({
//             id: proposalID,
//             walletAddress,
//             daoAddress,
//           } as CheckVoteRequest),
//         });

//         // Handle rate limiting - don't update state on error
//         if (res.status === 429) {
//           console.warn(
//             `Rate limited on member-voted for proposal ${proposalID}`,
//           );
//           return; // Don't update state - leave it as unknown
//         }

//         if (!res.ok) {
//           console.warn(
//             `Failed to check vote status for proposal ${proposalID}`,
//           );
//           return; // Don't update state on error
//         }

//         const result: CheckVoteResponse = await res.json();

//         console.log("result:", result)

//         // Only update state if we got a valid response
//         if (isMountedRef.current) {
//           setUserVotes((prev) => {
//             const existing = prev[proposalID];

//             // IMPORTANT: Don't overwrite if we already know they voted locally
//             // The blockchain might not have synced yet, so API could return false
//             if (existing?.hasVoted && !result.hasVoted) {
//               console.log(
//                 `Keeping local vote state for proposal ${proposalID} (blockchain may not have synced)`,
//               );
//               return prev; // Keep existing state
//             }

//             return {
//   ...prev,
//   [proposalID]: {
//     hasVoted: result.hasVoted,
//     voteChoice: result.voteChoice,
//   },
// };
//           });
//         }
//       } catch (err: unknown) {
//         console.error("Error checking vote status:", err);
//         // Don't update state on error
//       }
//     },
//     [setUserVotes],
//   );

//   const fetchTransactionHashesFromBlockchain = useCallback(
//     async (proposalIds: number[]): Promise<void> => {
//       if (proposalIds.length === 0) return;

//       try {
//         const { data: sessionData } = await supabase.auth.getSession();
//         const accessToken = sessionData?.session?.access_token;

//         const res = await fetch(`${API_URL}/get-proposal-tx-hashes`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${accessToken}`,
//           },
//           body: JSON.stringify({
//             daoAddress: dao.DAOID,
//             proposalIds,
//           }),
//         });

//         // Handle rate limiting
//         if (res.status === 429) {
//           console.warn("Rate limited on get-proposal-tx-hashes");
//           return;
//         }

//         if (!res.ok) {
//           return;
//         }

//         const result = (await res.json()) as {
//           success: boolean;
//           transactionHashes?: Array<{
//             proposalId: number;
//             transactionHash: string | null;
//           }>;
//         };

//         if (
//           result.success &&
//           result.transactionHashes &&
//           isMountedRef.current
//         ) {
//           const txHashMap: { [key: number]: string } = {};

//           result.transactionHashes.forEach((item) => {
//             if (item.transactionHash) {
//               txHashMap[item.proposalId] = item.transactionHash;
//             }
//           });

//           setTransactionHashes(txHashMap);
//         }
//       } catch (error) {
//         console.error("Error fetching transaction hashes:", error);
//       }
//     },
//     [dao.DAOID],
//   );

//   // ✅ Subscription removed - page.tsx handles Supabase Realtime at the page level
//   // This prevents duplicate subscriptions and ensures data persists across tab switches

//   // Fetch initial user votes - skip if we already have data from parent (tab switch)
//   // On full page refresh, userVotes will be empty so we fetch
//   useEffect(() => {
//     // Skip if we already have user vote data (persisted from parent state on tab switch)
//     const hasExistingVoteData = Object.keys(userVotes).length > 0;
//     if (hasExistingVoteData) {
//       console.log("🔍 Skipping vote check - have data from parent state");
//       return;
//     }

//     // Skip if already fetching this session (prevents double-fetch within same mount)
//     if (voteCheckDone.current) return;
//     if (proposals.length === 0 || proposalsLoading || !storedWallet) return;

//     voteCheckDone.current = true;
//     console.log(
//       "🔍 Fetching initial user votes for",
//       proposals.length,
//       "proposals",
//     );

//     const fetchInitialUserVotes = async () => {
//       const currentProposals = [...proposals];
//       for (const proposal of currentProposals) {
//         if (!isMountedRef.current) return;
//         await checkVote(Number(proposal.id), storedWallet, dao.DAOID);
//         await new Promise((resolve) => setTimeout(resolve, 400));
//       }
//     };

//     fetchInitialUserVotes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [proposals.length, proposalsLoading, storedWallet, dao.DAOID]);

//   // Fetch initial vote counts - only if proposals don't already have vote data
//   useEffect(() => {
//     if (initialFetchDone.current) return;
//     if (proposals.length === 0 || proposalsLoading) return;

//     // Skip if proposals already have vote data from Supabase
//     const hasVoteData = proposals.some(
//       (p) => p.votesFor !== undefined || p.votesAgainst !== undefined,
//     );
//     if (hasVoteData) {
//       console.log(
//         "📊 Skipping vote count fetch - proposals already have vote data",
//       );
//       initialFetchDone.current = true;
//       return;
//     }

//     initialFetchDone.current = true;
//     console.log(
//       "📊 Fetching initial vote counts for",
//       proposals.length,
//       "proposals",
//     );

//     const fetchInitialVoteCounts = async () => {
//       const currentRequestId = ++requestIdRef.current;
//       const currentProposals = [...proposals];

//       for (const proposal of currentProposals) {
//         if (currentRequestId !== requestIdRef.current || !isMountedRef.current)
//           return;

//         const votes = await fetchProposalVotes(Number(proposal.id));

//         if (
//           votes &&
//           isMountedRef.current &&
//           currentRequestId === requestIdRef.current
//         ) {
//           setProposals((prev) =>
//             prev.map((p) =>
//               p.id === proposal.id
//                 ? {
//                     ...p,
//                     votesFor: votes.yesVotes,
//                     votesAgainst: votes.noVotes,
//                   }
//                 : p,
//             ),
//           );
//         }

//         await new Promise((resolve) => setTimeout(resolve, 400));
//       }
//     };

//     fetchInitialVoteCounts();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [proposals.length, proposalsLoading]);

//   // Fetch transaction hashes - only once per mount
//   useEffect(() => {
//     if (txHashFetchDone.current) return;
//     if (proposals.length === 0 || proposalsLoading) return;

//     txHashFetchDone.current = true;
//     console.log(
//       "🔗 Fetching transaction hashes for",
//       proposals.length,
//       "proposals",
//     );

//     const proposalIds = proposals.map((p) => Number(p.id));
//     fetchTransactionHashesFromBlockchain(proposalIds);
//   }, [proposals, proposalsLoading, fetchTransactionHashesFromBlockchain]);

//   // Update statuses periodically (for time-based status changes)
//   useEffect(() => {
//     const timer = setInterval(() => {
//       updateProposalStatuses();
//     }, 60000);

//     return () => clearInterval(timer);
//   }, [updateProposalStatuses]);

//   // Calculate blocking proposals
//   useEffect(() => {
//     const passedProposals = displayProposals.filter(
//       (p) => p.computedStatus === "passed",
//     );
//     const sortedPassedProposals = passedProposals.sort(
//       (a, b) => Number(a.id) - Number(b.id),
//     );

//     const blockingMap: { [key: number]: number | null } = {};

//     sortedPassedProposals.forEach((proposal, index) => {
//       if (proposal.executed) {
//         blockingMap[Number(proposal.id)] = null;
//       } else {
//         for (let i = index - 1; i >= 0; i--) {
//           if (!sortedPassedProposals[i].executed) {
//             blockingMap[Number(proposal.id)] = Number(
//               sortedPassedProposals[i].id,
//             );
//             break;
//           }
//         }
//         if (blockingMap[Number(proposal.id)] === undefined) {
//           blockingMap[Number(proposal.id)] = null;
//         }
//       }
//     });

//     setBlockingProposalId(blockingMap);
//   }, [displayProposals]);

//   // Cleanup on unmount
//   useEffect(() => {
//     isMountedRef.current = true;
//     const currentRequestId = requestIdRef.current;
//     return () => {
//       isMountedRef.current = false;
//       // Increment to invalidate any pending requests
//       if (requestIdRef.current === currentRequestId) {
//         requestIdRef.current++;
//       }
//     };
//   }, []);

//   const handleIssueExecution = async (
//     daoAddress: string,
//     proposalId: number,
//     proposalType: string,
//     proposalAction: Proposal["proposalAction"],
//   ) => {
//     setExecutionErrors((prev) => {
//       const newErrors = { ...prev };
//       delete newErrors[proposalId];
//       return newErrors;
//     });

//     setExecutionStates((prev) => ({ ...prev, [proposalId]: "executing" }));

//     try {
//       const { data: sessionData } = await supabase.auth.getSession();
//       const accessToken = sessionData?.session?.access_token;
//       let endpoint = "";

//       const wallet = sessionStorage.getItem("selectedWallet");
//       if (proposalType === "ISSUE") {
//         endpoint = `${API_URL}/issue-execution`;
//       } else if (proposalType === "UPDATE_GOV_SETTINGS") {
//         endpoint = `${API_URL}/gov-settings-execution`;
//       } else if (proposalType === "SIGNAL") {
//         endpoint = `${API_URL}/signal-execution`;
//       } else if (proposalType === "TREASURY_WITHDRAWL") {
//         endpoint = `${API_URL}/treasury-withdrawl`;
//       } else {
//         endpoint = `${API_URL}/kick-execution`;
//       }

//       const res = await fetch(endpoint, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: JSON.stringify({
//           daoAddress,
//           proposalId,
//           ...(proposalType !== "SIGNAL" &&
//             proposalType !== "TREASURY_WITHDRAWL" && { proposalAction }),
//           walletAddress: wallet,
//           accessToken,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error(`HTTP ${res.status}: ${res.statusText}`);
//       }

//       const result = await res.json();
//       const jsonResult = result as { success: boolean; message?: string };

//       if (!jsonResult.success) {
//         throw new Error(jsonResult.message || "Execution failed");
//       }

//       setExecutionStates((prev) => ({ ...prev, [proposalId]: "executed" }));

//       setProposals((prev) =>
//         prev.map((p) =>
//           Number(p.id) === proposalId ? { ...p, executed: true } : p,
//         ),
//       );
//     } catch (error: unknown) {
//       const errorMessage =
//         error instanceof Error ? error.message : "Unknown error occurred";
//       console.error("Execution error:", errorMessage);

//       setExecutionStates((prev) => ({ ...prev, [proposalId]: "error" }));
//       setExecutionErrors((prev) => ({ ...prev, [proposalId]: errorMessage }));

//       setTimeout(() => {
//         setExecutionStates((prev) => ({ ...prev, [proposalId]: "idle" }));
//         setExecutionErrors((prev) => {
//           const newErrors = { ...prev };
//           delete newErrors[proposalId];
//           return newErrors;
//         });
//       }, 5000);
//     }
//   };

//   const handleVote = async (
//     proposalId: number,
//     vote: boolean,
//     walletAddress: string,
//     daoAddress: string,
//   ) => {
//     console.log("🗳️ handleVote called:", {
//       proposalId,
//       vote,
//       walletAddress,
//       daoAddress,
//     });

//     setVoteErrors((prev) => {
//       const newErrors = { ...prev };
//       delete newErrors[proposalId];
//       return newErrors;
//     });

//     setVotingStates((prev) => ({ ...prev, [proposalId]: "voting" }));

//     try {
//       console.log("🗳️ Getting session...");
//       const { data: sessionData, error: sessionError } =
//         await supabase.auth.getSession();

//       if (sessionError) {
//         console.error("🗳️ Session error:", sessionError);
//         throw new Error("Failed to get session");
//       }

//       const accessToken = sessionData?.session?.access_token;
//       console.log("🗳️ Access token exists:", !!accessToken);

//       if (!accessToken) {
//         throw new Error("No access token found - please log in again");
//       }

//       console.log("🗳️ Sending vote request to", `${API_URL}/vote`);

//       const res = await fetch(`${API_URL}/vote`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: JSON.stringify({
//           id: proposalId,
//           vote,
//           walletAddress,
//           daoAddress,
//         } as VoteRequest),
//       });

//       console.log("🗳️ Vote response status:", res.status);
//       const result = (await res.json()) as VoteResponse;
//       console.log("🗳️ Vote result:", result);

//       if (!res.ok || !result.success) {
//         throw new Error(
//           result.message || `HTTP ${res.status}: ${res.statusText}`,
//         );
//       }

//       // Only update vote status after successful vote
//       setUserVotes((prev) => ({
//         ...prev,
//         [proposalId]: {
//           hasVoted: true,
//           voteChoice: vote,
//         },
//       }));

//       setVotingStates((prev) => ({ ...prev, [proposalId]: "confirming" }));

//       setTimeout(async () => {
//         try {
//           const updatedVotes = await fetchProposalVotes(proposalId);

//           if (updatedVotes && isMountedRef.current) {
//             setProposals((prev) =>
//               prev.map((p) =>
//                 Number(p.id) === proposalId
//                   ? {
//                       ...p,
//                       votesFor: updatedVotes.yesVotes,
//                       votesAgainst: updatedVotes.noVotes,
//                     }
//                   : p,
//               ),
//             );
//           }

//           // DON'T call checkVote here - we already know the vote succeeded
//           // checkVote might return hasVoted: false if blockchain hasn't synced yet
//           // which would incorrectly show the vote buttons again

//           setVotingStates((prev) => ({ ...prev, [proposalId]: "success" }));

//           setTimeout(() => {
//             setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
//           }, 3000);
//         } catch (error) {
//           console.error("Failed to fetch updated data after vote:", error);
//           setVotingStates((prev) => ({ ...prev, [proposalId]: "success" }));
//           setTimeout(() => {
//             setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
//           }, 3000);
//         }
//       }, 3000);
//     } catch (err: unknown) {
//       const errorMessage =
//         err instanceof Error ? err.message : "Unknown error occurred";
//       console.error("Voting error:", errorMessage);

//       // Don't reset vote status on error if we don't know the true state
//       // Only reset if we know for sure the vote didn't go through

//       setVotingStates((prev) => ({ ...prev, [proposalId]: "error" }));
//       setVoteErrors((prev) => ({ ...prev, [proposalId]: errorMessage }));

//       setTimeout(() => {
//         setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
//         setVoteErrors((prev) => {
//           const newErrors = { ...prev };
//           delete newErrors[proposalId];
//           return newErrors;
//         });
//       }, 5000);
//     }
//   };

//   const canExecuteProposal = (proposalId: number): boolean => {
//     const passedProposals = displayProposals.filter(
//       (p) => p.computedStatus === "passed",
//     );
//     const sortedPassedProposals = passedProposals.sort(
//       (a, b) => Number(a.id) - Number(b.id),
//     );

//     const currentIndex = sortedPassedProposals.findIndex(
//       (p) => Number(p.id) === proposalId,
//     );

//     if (currentIndex === -1) return false;

//     for (let i = 0; i < currentIndex; i++) {
//       if (!sortedPassedProposals[i].executed) {
//         return false;
//       }
//     }

//     return true;
//   };

//   const getStatusBadgeClass = (status: string | undefined) => {
//     const safeStatus = status || "active";
//     switch (safeStatus) {
//       case "active":
//         return "bg-green-100 text-green-800";
//       case "passed":
//         return "bg-blue-100 text-blue-800";
//       case "rejected":
//         return "bg-red-100 text-red-800";
//       case "grace":
//         return "bg-yellow-100 text-yellow-800";
//       case "expired":
//         return "bg-gray-100 text-gray-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   const isProposalExpiringSoon = (endTime: number | undefined) => {
//     if (!endTime) return false;
//     const now = new Date().getTime();
//     const timeDiff = endTime - now;
//     const hoursUntilExpiry = timeDiff / (1000 * 60 * 60);
//     return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
//   };

//   const getTimeRemaining = (endTime: number | undefined) => {
//     if (!endTime) return "";
//     const now = new Date().getTime();
//     const timeDiff = endTime - now;

//     if (timeDiff <= 0) return "Expired";

//     const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
//     const hours = Math.floor(
//       (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
//     );
//     const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

//     if (days > 0) return `${days}d ${hours}h remaining`;
//     if (hours > 0) return `${hours}h ${minutes}m remaining`;
//     return `${minutes}m remaining`;
//   };

//   const getVotingButtonText = (
//     state: VotingState,
//     voteType: "for" | "against",
//   ) => {
//     switch (state) {
//       case "voting":
//         return "Submitting...";
//       case "confirming":
//         return "Confirming...";
//       case "success":
//         return "Success!";
//       case "error":
//         return "Failed";
//       default:
//         return voteType === "for" ? "Vote For" : "Vote Against";
//     }
//   };

//   const getExecutionButtonText = (state: ExecutionState) => {
//     switch (state) {
//       case "executing":
//         return "Executing...";
//       case "executed":
//         return "Executed";
//       case "error":
//         return "Failed";
//       default:
//         return "Execute";
//     }
//   };

//   const getButtonClass = (
//     proposalId: number,
//     buttonType: "for" | "against",
//   ) => {
//     const userVote = userVotes[proposalId];
//     const isDisabled = isButtonDisabled(proposalId);

//     if (userVote?.hasVoted) {
//       const isSelectedChoice =
//         (buttonType === "for" && userVote.voteChoice === true) ||
//         (buttonType === "against" && userVote.voteChoice === false);

//       if (isSelectedChoice) {
//         return buttonType === "for"
//           ? "px-4 py-2 rounded-md text-sm bg-green-700 text-white border-2 border-green-800 font-semibold"
//           : "px-4 py-2 rounded-md text-sm bg-red-700 text-white border-2 border-red-800 font-semibold";
//       } else {
//         return "px-4 py-2 rounded-md text-sm bg-gray-300 text-gray-500 cursor-not-allowed";
//       }
//     }

//     if (isDisabled) {
//       return "px-4 py-2 rounded-md text-sm bg-gray-300 text-gray-600 cursor-not-allowed";
//     }

//     return buttonType === "for"
//       ? "px-4 py-2 rounded-md transition-colors text-sm bg-green-600 text-white hover:bg-green-700"
//       : "px-4 py-2 rounded-md transition-colors text-sm bg-red-600 text-white hover:bg-red-700";
//   };

//   const getExecutionButtonClass = (proposalId: number) => {
//     const state = executionStates[proposalId] || "idle";

//     switch (state) {
//       case "executing":
//         return "px-4 py-2 bg-blue-400 text-white rounded-md cursor-not-allowed text-sm";
//       case "executed":
//         return "px-4 py-2 bg-green-600 text-white rounded-md cursor-not-allowed text-sm";
//       case "error":
//         return "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm";
//       default:
//         return "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm";
//     }
//   };

//   // const isButtonDisabled = (proposalId: number) => {
//   //   const state = votingStates[proposalId] || "idle";
//   //   const userVote = userVotes[proposalId];
//   //   return userVote?.hasVoted || state !== "idle";
//   // };

//   const isButtonDisabled = (proposalId: number) => {
//   const state = votingStates[proposalId] || "idle";
//   const userVote = userVotes[proposalId];
//   console.log("userVo2te:", userVote)
//   // Disable when: voting in progress, user has voted, or vote status not yet fetched
//   return state !== "idle" || userVote?.hasVoted === true || userVote === undefined;
// };

//   const isExecutionButtonDisabled = (proposalId: number) => {
//     const state = executionStates[proposalId] || "idle";
//     return state === "executing" || state === "executed";
//   };

//   if (proposalsLoading)
//     return <p className="text-gray-500">Loading proposals...</p>;

//   return (
//     <div className="max-w-4xl mx-auto">
//       {displayProposals.length === 0 ? (
//         <div className="text-center py-8">
//           <p className="text-gray-500">No proposals found.</p>
//         </div>
//       ) : (
//         <div className="space-y-6">
//           {displayProposals.map((proposal) => {
//             const proposalId = Number(proposal.id);
//             const votingState = votingStates[proposalId] || "idle";
//             const executionState = executionStates[proposalId] || "idle";
//             const voteError = voteErrors[proposalId];
//             const executionError = executionErrors[proposalId];

//             return (
//               <div
//                 key={proposal.id}
//                 className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
//               >
//                 <div className="p-6">
//                   <div className="flex justify-between items-start mb-4">
//                     <div className="flex items-center gap-2 flex-1 mr-4">
//                       <h2 className="text-xl font-semibold text-gray-900">
//                         {proposal.title}
//                       </h2>
//                       {transactionHashes[proposalId] && (
//                         <a
//                           href={`https://sepolia.etherscan.io/tx/${transactionHashes[proposalId]}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-gray-400 hover:text-[#5e00b2] transition-colors flex-shrink-0"
//                           title="View transaction on Etherscan"
//                         >
//                           <svg
//                             className="w-5 h-5"
//                             fill="currentColor"
//                             viewBox="0 0 24 24"
//                             xmlns="http://www.w3.org/2000/svg"
//                           >
//                             <path d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z" />
//                           </svg>
//                         </a>
//                       )}
//                     </div>
//                     <div className="flex flex-col items-end space-y-2">
//                       <span
//                         className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(proposal.computedStatus)}`}
//                       >
//                         {(proposal.computedStatus || "active").toUpperCase()}
//                       </span>
//                       {proposal.executed && (
//                         <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
//                           EXECUTED
//                         </span>
//                       )}

//                       {isProposalExpiringSoon(proposal.endTime) && (
//                         <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
//                           Expiring Soon
//                         </span>
//                       )}
//                       {(proposal.computedStatus === "active" ||
//                         proposal.computedStatus === "grace") &&
//                         proposal.endTime && (
//                           <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
//                             {getTimeRemaining(proposal.endTime)}
//                           </span>
//                         )}
//                     </div>
//                   </div>

//                   <p className="text-gray-700 mb-4">{proposal.description}</p>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//                     <div>
//                       <p className="text-sm text-gray-600 mb-1">
//                         <span className="font-medium">Proposal ID:</span>{" "}
//                         <span className="font-mono">#{proposal.id}</span>
//                       </p>
//                       {transactionHashes[proposalId] && (
//                         <p className="text-sm text-gray-600 mb-1">
//                           <a
//                             href={`https://sepolia.etherscan.io/tx/${transactionHashes[proposalId]}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="text-[#5e00b2] hover:text-[#7b2fd6] underline"
//                           >
//                             View on Etherscan ↗
//                           </a>
//                         </p>
//                       )}
//                       <p className="text-sm text-gray-600">
//                         <span className="font-medium">Type:</span>{" "}
//                         {proposal.proposalType}
//                       </p>
//                       {proposal.timestamp && (
//                         <p className="text-sm text-gray-600">
//                           <span className="font-medium">Submitted:</span>{" "}
//                           {new Date(proposal.timestamp).toLocaleString()}
//                         </p>
//                       )}
//                       {proposal.endTime && (
//                         <p className="text-sm text-gray-600">
//                           <span className="font-medium">Voting Ends:</span>{" "}
//                           {new Date(proposal.endTime).toLocaleString()}
//                         </p>
//                       )}
//                       {proposal.graceEndTime &&
//                         proposal.computedStatus === "grace" && (
//                           <p className="text-sm text-gray-600">
//                             <span className="font-medium">
//                               Grace Period Ends:
//                             </span>{" "}
//                             {new Date(proposal.graceEndTime).toLocaleString()}
//                           </p>
//                         )}
//                     </div>

//                     {(proposal.votesFor !== undefined ||
//                       proposal.votesAgainst !== undefined) && (
//                       <div>
//                         <p className="text-sm text-gray-600 mb-3">
//                           <span className="font-medium">Voting Results:</span>
//                         </p>
//                         <div className="space-y-2">
//                           <div className="flex justify-between items-center">
//                             <span className="text-sm text-green-600 font-medium">
//                               For:
//                             </span>
//                             <span className="text-sm font-bold text-gray-900">
//                               {(
//                                 Number(proposal.votesFor) / 10 ** 18 || 0
//                               ).toFixed(2)}{" "}
//                               votes
//                             </span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-sm text-red-600 font-medium">
//                               Against:
//                             </span>
//                             <span className="text-sm font-bold text-gray-900">
//                               {(
//                                 Number(proposal.votesAgainst) / 10 ** 18 || 0
//                               ).toFixed(2)}{" "}
//                               votes
//                             </span>
//                           </div>
//                           <div className="flex justify-between items-center pt-2 border-t border-gray-200">
//                             <span className="text-sm text-gray-700 font-medium">
//                               Total Votes:
//                             </span>
//                             <span className="text-sm font-bold text-gray-900">
//                               {(
//                                 (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                                 (Number(proposal.votesAgainst) / 10 ** 18 || 0)
//                               ).toFixed(2)}
//                             </span>
//                           </div>
//                           {proposal.quorum && (
//                             <div className="flex justify-between items-center">
//                               <span className="text-sm text-gray-500">
//                                 Quorum Required:
//                               </span>
//                               <span className="text-sm font-medium text-gray-700">
//                                 {proposal.quorum}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {proposal.votesFor !== undefined &&
//                     proposal.votesAgainst !== undefined && (
//                       <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                         <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
//                           <span>Vote Distribution</span>
//                           <span>
//                             {(
//                               (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                               (Number(proposal.votesAgainst) / 10 ** 18 || 0)
//                             ).toFixed(2)}{" "}
//                             total votes
//                           </span>
//                         </div>
//                         <div className="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden shadow-inner">
//                           <div
//                             className="bg-green-500 h-4 flex items-center justify-center"
//                             style={{
//                               width: `${((Number(proposal.votesFor) / 10 ** 18 || 0) / Math.max((Number(proposal.votesFor) / 10 ** 18 || 0) + (Number(proposal.votesAgainst) / 10 ** 18 || 0), 1)) * 100}%`,
//                             }}
//                           >
//                             {((Number(proposal.votesFor) / 10 ** 18 || 0) /
//                               Math.max(
//                                 (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                                   (Number(proposal.votesAgainst) / 10 ** 18 ||
//                                     0),
//                                 1,
//                               )) *
//                               100 >
//                               10 && (
//                               <span className="text-xs font-bold text-white">
//                                 {Math.round(
//                                   ((Number(proposal.votesFor) / 10 ** 18 || 0) /
//                                     Math.max(
//                                       (Number(proposal.votesFor) / 10 ** 18 ||
//                                         0) +
//                                         (Number(proposal.votesAgainst) /
//                                           10 ** 18 || 0),
//                                       1,
//                                     )) *
//                                     100,
//                                 )}
//                                 %
//                               </span>
//                             )}
//                           </div>
//                           <div
//                             className="bg-red-500 h-4 flex items-center justify-center"
//                             style={{
//                               width: `${((Number(proposal.votesAgainst) / 10 ** 18 || 0) / Math.max((Number(proposal.votesFor) / 10 ** 18 || 0) + (Number(proposal.votesAgainst) / 10 ** 18 || 0), 1)) * 100}%`,
//                             }}
//                           >
//                             {((Number(proposal.votesAgainst) / 10 ** 18 || 0) /
//                               Math.max(
//                                 (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                                   (Number(proposal.votesAgainst) / 10 ** 18 ||
//                                     0),
//                                 1,
//                               )) *
//                               100 >
//                               10 && (
//                               <span className="text-xs font-bold text-white">
//                                 {Math.round(
//                                   ((Number(proposal.votesAgainst) / 10 ** 18 ||
//                                     0) /
//                                     Math.max(
//                                       (Number(proposal.votesFor) / 10 ** 18 ||
//                                         0) +
//                                         (Number(proposal.votesAgainst) /
//                                           10 ** 18 || 0),
//                                       1,
//                                     )) *
//                                     100,
//                                 )}
//                                 %
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                         <div className="flex justify-between text-xs font-medium mt-2">
//                           <span className="text-green-600">
//                             For:{" "}
//                             {(
//                               Number(proposal.votesFor) / 10 ** 18 || 0
//                             ).toFixed(2)}{" "}
//                             (
//                             {Math.round(
//                               ((Number(proposal.votesFor) / 10 ** 18 || 0) /
//                                 Math.max(
//                                   (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                                     (Number(proposal.votesAgainst) / 10 ** 18 ||
//                                       0),
//                                   1,
//                                 )) *
//                                 100,
//                             )}
//                             %)
//                           </span>
//                           <span className="text-red-600">
//                             Against:{" "}
//                             {(
//                               Number(proposal.votesAgainst) / 10 ** 18 || 0
//                             ).toFixed(2)}{" "}
//                             (
//                             {Math.round(
//                               ((Number(proposal.votesAgainst) / 10 ** 18 || 0) /
//                                 Math.max(
//                                   (Number(proposal.votesFor) / 10 ** 18 || 0) +
//                                     (Number(proposal.votesAgainst) / 10 ** 18 ||
//                                       0),
//                                   1,
//                                 )) *
//                                 100,
//                             )}
//                             %)
//                           </span>
//                         </div>
//                       </div>
//                     )}

//                   {proposal.computedStatus === "grace" && (
//                     <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
//                       <p className="text-sm text-yellow-800">
//                         Voting has ended. This proposal is in its grace period
//                         where final results are being processed.
//                       </p>
//                     </div>
//                   )}

//                   {voteError && (
//                     <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
//                       <p className="text-sm text-red-800">{voteError}</p>
//                     </div>
//                   )}

//                   {executionError && (
//                     <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
//                       <p className="text-sm text-red-800">{executionError}</p>
//                     </div>
//                   )}

//                   {proposal.computedStatus === "active" && storedWallet && (
//                     <div className="flex flex-col space-y-3">
//                       {userVotes[proposalId]?.hasVoted &&
//                       votingState === "idle" ? (
//                         <div className="flex flex-col space-y-2">
//                           <div className="flex space-x-3">
//                             <button
//                               disabled={true}
//                               className={getButtonClass(proposalId, "for")}
//                             >
//                               {userVotes[proposalId]?.voteChoice === true
//                                 ? "✓ Voted For"
//                                 : "Vote For"}
//                             </button>
//                             <button
//                               disabled={true}
//                               className={getButtonClass(proposalId, "against")}
//                             >
//                               {userVotes[proposalId]?.voteChoice === false
//                                 ? "✓ Voted Against"
//                                 : "Vote Against"}
//                             </button>
//                           </div>
//                           <div className="flex items-center space-x-2">
//                             <span className="text-sm text-green-600">
//                               ✓ Your vote:{" "}
//                               {userVotes[proposalId]?.voteChoice
//                                 ? "FOR"
//                                 : "AGAINST"}
//                             </span>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="flex space-x-3">
//                           <button
//                             onClick={() =>
//                               handleVote(
//                                 proposalId,
//                                 true,
//                                 storedWallet,
//                                 dao.DAOID,
//                               )
//                             }
//                             disabled={isButtonDisabled(proposalId)}
//                             className={getButtonClass(proposalId, "for")}
//                           >
//                             {getVotingButtonText(votingState, "for")}
//                           </button>
//                           <button
//                             onClick={() =>
//                               handleVote(
//                                 proposalId,
//                                 false,
//                                 storedWallet,
//                                 dao.DAOID,
//                               )
//                             }
//                             disabled={isButtonDisabled(proposalId)}
//                             className={getButtonClass(proposalId, "against")}
//                           >
//                             {getVotingButtonText(votingState, "against")}
//                           </button>
//                         </div>
//                       )}

//                       {votingState === "voting" && (
//                         <p className="text-sm text-blue-600">
//                           📤 Submitting your vote...
//                         </p>
//                       )}
//                       {votingState === "confirming" && (
//                         <p className="text-sm text-orange-600">
//                           ⏳ Waiting for blockchain confirmation...
//                         </p>
//                       )}
//                       {votingState === "success" && (
//                         <p className="text-sm text-green-600">
//                           ✅ Vote confirmed successfully!
//                         </p>
//                       )}
//                     </div>
//                   )}

//                   {proposal.computedStatus === "passed" &&
//                     !shouldReturn &&
//                     !proposal.executed && (
//                       <div>
//                         {blockingProposalId[proposalId] && (
//                           <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
//                             <p className="text-sm text-orange-800">
//                               ⚠️ Proposal #{blockingProposalId[proposalId]} must
//                               be executed first
//                             </p>
//                           </div>
//                         )}

//                         <button
//                           onClick={() =>
//                             handleIssueExecution(
//                               dao.DAOID,
//                               proposalId,
//                               proposal.proposalType,
//                               proposal.proposalAction!,
//                             )
//                           }
//                           disabled={
//                             isExecutionButtonDisabled(proposalId) ||
//                             !canExecuteProposal(proposalId)
//                           }
//                           className={
//                             blockingProposalId[proposalId]
//                               ? "px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed text-sm"
//                               : getExecutionButtonClass(proposalId)
//                           }
//                         >
//                           {blockingProposalId[proposalId]
//                             ? "Blocked - Execute Previous Proposal"
//                             : getExecutionButtonText(executionState)}
//                         </button>

//                         {executionState === "executing" && (
//                           <p className="text-sm text-blue-600 mt-2">
//                             ⚙️ Executing proposal...
//                           </p>
//                         )}
//                       </div>
//                     )}

//                   {proposal.computedStatus === "passed" &&
//                     executionState === "executed" && (
//                       <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
//                         <p className="text-sm text-green-800">
//                           ✅ This proposal has been executed successfully.
//                         </p>
//                       </div>
//                     )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { DAO, VoteRequest, CheckVoteResponse, Proposal } from "./types";
import { API_URL } from "@/utils/config";

const supabase = createClient();

// Extended Proposal type with computed fields for UI display
interface ProposalWithComputed extends Proposal {
  endTime?: number;
  graceEndTime?: number;
  quorum?: number;
  computedStatus?: "active" | "passed" | "rejected" | "grace" | "expired";
}

interface UserVoteChoice {
  hasVoted: boolean;
  voteChoice?: boolean;
}

interface DaoGovernanceProps {
  dao: DAO;
  proposals: Proposal[];
  setProposals: React.Dispatch<React.SetStateAction<Proposal[]>>;
  proposalsLoading: boolean;
  userVotes: { [proposalId: number]: UserVoteChoice };
  setUserVotes: React.Dispatch<
    React.SetStateAction<{ [proposalId: number]: UserVoteChoice }>
  >;
}

interface CheckVoteRequest {
  id: number;
  walletAddress: string;
  daoAddress: string;
}

interface ProposalVotes {
  yesVotes: string;
  noVotes: string;
}

interface VoteResponse {
  success: boolean;
  message?: string;
  transactionHash?: string;
}

type VotingState = "idle" | "voting" | "confirming" | "success" | "error";
type ExecutionState = "idle" | "executing" | "executed" | "error";

export default function ProposalsPage({
  dao,
  proposals,
  setProposals,
  proposalsLoading,
  userVotes,
  setUserVotes,
}: DaoGovernanceProps) {
  const [displayProposals, setDisplayProposals] = useState<
    ProposalWithComputed[]
  >([]);
  const [votingStates, setVotingStates] = useState<{
    [proposalId: number]: VotingState;
  }>({});
  const [voteErrors, setVoteErrors] = useState<{
    [proposalId: number]: string;
  }>({});
  const [executionStates, setExecutionStates] = useState<{
    [proposalId: number]: ExecutionState;
  }>({});
  const [executionErrors, setExecutionErrors] = useState<{
    [proposalId: number]: string;
  }>({});
  const [blockingProposalId, setBlockingProposalId] = useState<{
    [proposalId: number]: number | null;
  }>({});
  const [transactionHashes, setTransactionHashes] = useState<{
    [proposalId: number]: string;
  }>({});

  // Request ID pattern to prevent race conditions
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const initialFetchDone = useRef(false);
  const txHashFetchDone = useRef(false);
  // Track which proposal IDs have already been vote-checked (per-proposal, not all-or-nothing)
  const checkedProposalIds = useRef<Set<number>>(new Set());

  const storedWallet =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedWallet")
      : null;

  const shouldReturn = !storedWallet;

  // ─── localStorage persistence for votes ───────────────────────────────────
  // Keyed per DAO so votes from different DAOs don't collide
  const VOTE_STORAGE_KEY = `userVotes_${dao.DAOID}`;

  const loadPersistedVotes = useCallback((): {
    [proposalId: number]: UserVoteChoice;
  } => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(VOTE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, [VOTE_STORAGE_KEY]);

  const persistVote = useCallback(
    (proposalId: number, choice: UserVoteChoice) => {
      if (typeof window === "undefined") return;
      try {
        const existing = loadPersistedVotes();
        localStorage.setItem(
          VOTE_STORAGE_KEY,
          JSON.stringify({ ...existing, [proposalId]: choice }),
        );
      } catch {}
    },
    [VOTE_STORAGE_KEY, loadPersistedVotes],
  );

  // On mount, immediately seed userVotes from localStorage so buttons are
  // disabled before the API calls even complete (survives page refresh)
  useEffect(() => {
    const persisted = loadPersistedVotes();
    if (Object.keys(persisted).length > 0) {
      setUserVotes((prev) => ({
        ...persisted, // localStorage as base
        ...prev, // parent / tab-switch state wins if it already has data
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  // Compute proposal status and time fields
  const computeProposalFields = useCallback(
    (proposal: Proposal): ProposalWithComputed => {
      const now = new Date().getTime();

      if (!proposal.timestamp || !dao.Members?.governance) {
        return { ...proposal, computedStatus: "active" };
      }

      const voteEndTime =
        proposal.timestamp + dao.Members.governance.votingPeriod * 60 * 1000;
      const graceEndTime =
        voteEndTime + dao.Members.governance.gracePeriod * 60 * 1000;
      const quorum = dao.Members.governance.quorum;

      let computedStatus: ProposalWithComputed["computedStatus"] = "active";

      if (proposal.executed) {
        computedStatus = "passed";
      } else if (now > graceEndTime) {
        const votesFor = Number(proposal.votesFor || "0");
        const votesAgainst = Number(proposal.votesAgainst || "0");
        const totalVotes = votesFor + votesAgainst;

        if (totalVotes < quorum) {
          computedStatus = "rejected";
        } else if (votesFor > votesAgainst) {
          computedStatus = "passed";
        } else {
          computedStatus = "rejected";
        }
      } else if (now <= voteEndTime) {
        computedStatus = "active";
      } else if (now > voteEndTime && now <= graceEndTime) {
        computedStatus = "grace";
      } else {
        computedStatus = "expired";
      }

      return {
        ...proposal,
        endTime: voteEndTime,
        graceEndTime,
        quorum,
        computedStatus,
      };
    },
    [dao.Members?.governance],
  );

  // Sync displayProposals with proposals from props
  useEffect(() => {
    const computed = proposals.map(computeProposalFields);
    setDisplayProposals(computed);
  }, [proposals, computeProposalFields]);

  const updateProposalStatuses = useCallback(() => {
    setDisplayProposals((prevProposals) =>
      prevProposals.map((proposal) => computeProposalFields(proposal)),
    );
  }, [computeProposalFields]);

  const fetchProposalVotes = useCallback(
    async (proposalId: number): Promise<ProposalVotes | null> => {
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
            walletAddress: storedWallet,
            daoAddress: dao.DAOID,
          }),
        });

        if (res.status === 429) {
          console.warn(`Rate limited on get-votes for proposal ${proposalId}`);
          return null;
        }

        if (!res.ok) {
          return null;
        }

        const data = await res.json();

        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          data.success &&
          "result" in data &&
          data.result &&
          typeof data.result === "object" &&
          "yesVotes" in data.result &&
          "noVotes" in data.result
        ) {
          return {
            yesVotes: String(data.result.yesVotes || "0"),
            noVotes: String(data.result.noVotes || "0"),
          };
        } else {
          return { yesVotes: "0", noVotes: "0" };
        }
      } catch (error) {
        console.error(
          "Failed to fetch votes for proposal",
          proposalId,
          ":",
          error,
        );
        return null;
      }
    },
    [storedWallet, dao.DAOID],
  );

  const checkVote = useCallback(
    async (proposalID: number, walletAddress: string, daoAddress: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const res = await fetch(`${API_URL}/member-voted`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            id: proposalID,
            walletAddress,
            daoAddress,
          } as CheckVoteRequest),
        });

        if (res.status === 429) {
          console.warn(
            `Rate limited on member-voted for proposal ${proposalID}`,
          );
          return;
        }

        if (!res.ok) {
          console.warn(
            `Failed to check vote status for proposal ${proposalID}`,
          );
          return;
        }

        const result: CheckVoteResponse = await res.json();

        if (isMountedRef.current) {
          setUserVotes((prev) => {
            const existing = prev[proposalID];

            // Don't overwrite a locally-known vote with a stale API response —
            // the blockchain may not have synced yet so the API can return false
            // even though the user genuinely voted. localStorage seeds this on mount
            // so existing.hasVoted will be true immediately after a page refresh.
            if (existing?.hasVoted && !result.hasVoted) {
              console.log(
                `Keeping local vote state for proposal ${proposalID} (blockchain may not have synced)`,
              );
              return prev;
            }

            return {
              ...prev,
              [proposalID]: {
                hasVoted: result.hasVoted,
                voteChoice: result.voteChoice,
              },
            };
          });
        }
      } catch (err: unknown) {
        console.error("Error checking vote status:", err);
      }
    },
    [setUserVotes],
  );

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

        if (
          result.success &&
          result.transactionHashes &&
          isMountedRef.current
        ) {
          const txHashMap: { [key: number]: string } = {};

          result.transactionHashes.forEach((item) => {
            if (item.transactionHash) {
              txHashMap[item.proposalId] = item.transactionHash;
            }
          });

          setTransactionHashes(txHashMap);
        }
      } catch (error) {
        console.error("Error fetching transaction hashes:", error);
      }
    },
    [dao.DAOID],
  );

  // Fetch user vote status — checks only proposals not yet checked this session.
  // Using a per-proposal Set instead of a single boolean flag means:
  //   • Tab switches that add new proposals still get checked
  //   • Already-checked proposals are never re-fetched unnecessarily
  //   • The old "bail if any votes exist" short-circuit no longer skips proposals
  useEffect(() => {
    if (proposals.length === 0 || proposalsLoading || !storedWallet) return;

    const uncheckedProposals = proposals.filter(
      (p) => !checkedProposalIds.current.has(Number(p.id)),
    );

    if (uncheckedProposals.length === 0) return;

    const fetchVotes = async () => {
      for (const proposal of uncheckedProposals) {
        if (!isMountedRef.current) return;
        const id = Number(proposal.id);
        // Mark before fetching to prevent duplicate calls if the effect re-runs
        checkedProposalIds.current.add(id);
        await checkVote(id, storedWallet, dao.DAOID);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    };

    fetchVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals.length, proposalsLoading, storedWallet, dao.DAOID]);

  // Fetch initial vote counts - only if proposals don't already have vote data
  useEffect(() => {
    if (initialFetchDone.current) return;
    if (proposals.length === 0 || proposalsLoading) return;

    const hasVoteData = proposals.some(
      (p) => p.votesFor !== undefined || p.votesAgainst !== undefined,
    );
    if (hasVoteData) {
      console.log(
        "📊 Skipping vote count fetch - proposals already have vote data",
      );
      initialFetchDone.current = true;
      return;
    }

    initialFetchDone.current = true;
    console.log(
      "📊 Fetching initial vote counts for",
      proposals.length,
      "proposals",
    );

    const fetchInitialVoteCounts = async () => {
      const currentRequestId = ++requestIdRef.current;
      const currentProposals = [...proposals];

      for (const proposal of currentProposals) {
        if (currentRequestId !== requestIdRef.current || !isMountedRef.current)
          return;

        const votes = await fetchProposalVotes(Number(proposal.id));

        if (
          votes &&
          isMountedRef.current &&
          currentRequestId === requestIdRef.current
        ) {
          setProposals((prev) =>
            prev.map((p) =>
              p.id === proposal.id
                ? {
                    ...p,
                    votesFor: votes.yesVotes,
                    votesAgainst: votes.noVotes,
                  }
                : p,
            ),
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    };

    fetchInitialVoteCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals.length, proposalsLoading]);

  // Fetch transaction hashes - only once per mount
  useEffect(() => {
    if (txHashFetchDone.current) return;
    if (proposals.length === 0 || proposalsLoading) return;

    txHashFetchDone.current = true;
    console.log(
      "🔗 Fetching transaction hashes for",
      proposals.length,
      "proposals",
    );

    const proposalIds = proposals.map((p) => Number(p.id));
    fetchTransactionHashesFromBlockchain(proposalIds);
  }, [proposals, proposalsLoading, fetchTransactionHashesFromBlockchain]);

  // Update statuses periodically (for time-based status changes)
  useEffect(() => {
    const timer = setInterval(() => {
      updateProposalStatuses();
    }, 60000);

    return () => clearInterval(timer);
  }, [updateProposalStatuses]);

  // Calculate blocking proposals
  useEffect(() => {
    const passedProposals = displayProposals.filter(
      (p) => p.computedStatus === "passed",
    );
    const sortedPassedProposals = passedProposals.sort(
      (a, b) => Number(a.id) - Number(b.id),
    );

    const blockingMap: { [key: number]: number | null } = {};

    sortedPassedProposals.forEach((proposal, index) => {
      if (proposal.executed) {
        blockingMap[Number(proposal.id)] = null;
      } else {
        for (let i = index - 1; i >= 0; i--) {
          if (!sortedPassedProposals[i].executed) {
            blockingMap[Number(proposal.id)] = Number(
              sortedPassedProposals[i].id,
            );
            break;
          }
        }
        if (blockingMap[Number(proposal.id)] === undefined) {
          blockingMap[Number(proposal.id)] = null;
        }
      }
    });

    setBlockingProposalId(blockingMap);
  }, [displayProposals]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const currentRequestId = requestIdRef.current;
    return () => {
      isMountedRef.current = false;
      if (requestIdRef.current === currentRequestId) {
        requestIdRef.current++;
      }
    };
  }, []);

  const handleIssueExecution = async (
    daoAddress: string,
    proposalId: number,
    proposalType: string,
    proposalAction: Proposal["proposalAction"],
  ) => {
    setExecutionErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[proposalId];
      return newErrors;
    });

    setExecutionStates((prev) => ({ ...prev, [proposalId]: "executing" }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      let endpoint = "";

      const wallet = sessionStorage.getItem("selectedWallet");
      if (proposalType === "ISSUE") {
        endpoint = `${API_URL}/issue-execution`;
      } else if (proposalType === "UPDATE_GOV_SETTINGS") {
        endpoint = `${API_URL}/gov-settings-execution`;
      } else if (proposalType === "SIGNAL") {
        endpoint = `${API_URL}/signal-execution`;
      } else if (proposalType === "TREASURY_WITHDRAWL") {
        endpoint = `${API_URL}/treasury-withdrawl`;
      } else {
        endpoint = `${API_URL}/kick-execution`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          daoAddress,
          proposalId,
          ...(proposalType !== "SIGNAL" &&
            proposalType !== "TREASURY_WITHDRAWL" && { proposalAction }),
          walletAddress: wallet,
          accessToken,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      const jsonResult = result as { success: boolean; message?: string };

      if (!jsonResult.success) {
        throw new Error(jsonResult.message || "Execution failed");
      }

      setExecutionStates((prev) => ({ ...prev, [proposalId]: "executed" }));

      setProposals((prev) =>
        prev.map((p) =>
          Number(p.id) === proposalId ? { ...p, executed: true } : p,
        ),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Execution error:", errorMessage);

      setExecutionStates((prev) => ({ ...prev, [proposalId]: "error" }));
      setExecutionErrors((prev) => ({ ...prev, [proposalId]: errorMessage }));

      setTimeout(() => {
        setExecutionStates((prev) => ({ ...prev, [proposalId]: "idle" }));
        setExecutionErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[proposalId];
          return newErrors;
        });
      }, 5000);
    }
  };

  const handleVote = async (
    proposalId: number,
    vote: boolean,
    walletAddress: string,
    daoAddress: string,
  ) => {
    setVoteErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[proposalId];
      return newErrors;
    });

    setVotingStates((prev) => ({ ...prev, [proposalId]: "voting" }));

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error("Failed to get session");
      }

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("No access token found - please log in again");
      }

      const res = await fetch(`${API_URL}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: proposalId,
          vote,
          walletAddress,
          daoAddress,
        } as VoteRequest),
      });

      const result = (await res.json()) as VoteResponse;

      if (!res.ok || !result.success) {
        throw new Error(
          result.message || `HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const voteChoice: UserVoteChoice = { hasVoted: true, voteChoice: vote };

      // Update in-memory state
      setUserVotes((prev) => ({ ...prev, [proposalId]: voteChoice }));

      // Persist to localStorage so the button stays disabled after a page refresh,
      // even before the blockchain has synced and the API returns hasVoted: true
      persistVote(proposalId, voteChoice);

      setVotingStates((prev) => ({ ...prev, [proposalId]: "confirming" }));

      setTimeout(async () => {
        try {
          const updatedVotes = await fetchProposalVotes(proposalId);

          if (updatedVotes && isMountedRef.current) {
            setProposals((prev) =>
              prev.map((p) =>
                Number(p.id) === proposalId
                  ? {
                      ...p,
                      votesFor: updatedVotes.yesVotes,
                      votesAgainst: updatedVotes.noVotes,
                    }
                  : p,
              ),
            );
          }

          setVotingStates((prev) => ({ ...prev, [proposalId]: "success" }));

          setTimeout(() => {
            setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
          }, 3000);
        } catch (error) {
          console.error("Failed to fetch updated data after vote:", error);
          setVotingStates((prev) => ({ ...prev, [proposalId]: "success" }));
          setTimeout(() => {
            setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
          }, 3000);
        }
      }, 3000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Voting error:", errorMessage);

      setVotingStates((prev) => ({ ...prev, [proposalId]: "error" }));
      setVoteErrors((prev) => ({ ...prev, [proposalId]: errorMessage }));

      setTimeout(() => {
        setVotingStates((prev) => ({ ...prev, [proposalId]: "idle" }));
        setVoteErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[proposalId];
          return newErrors;
        });
      }, 5000);
    }
  };

  const canExecuteProposal = (proposalId: number): boolean => {
    const passedProposals = displayProposals.filter(
      (p) => p.computedStatus === "passed",
    );
    const sortedPassedProposals = passedProposals.sort(
      (a, b) => Number(a.id) - Number(b.id),
    );

    const currentIndex = sortedPassedProposals.findIndex(
      (p) => Number(p.id) === proposalId,
    );

    if (currentIndex === -1) return false;

    for (let i = 0; i < currentIndex; i++) {
      if (!sortedPassedProposals[i].executed) {
        return false;
      }
    }

    return true;
  };

  const getStatusBadgeClass = (status: string | undefined) => {
    const safeStatus = status || "active";
    switch (safeStatus) {
      case "active":
        return "bg-green-100 text-green-800";
      case "passed":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "grace":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isProposalExpiringSoon = (endTime: number | undefined) => {
    if (!endTime) return false;
    const now = new Date().getTime();
    const timeDiff = endTime - now;
    const hoursUntilExpiry = timeDiff / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
  };

  const getTimeRemaining = (endTime: number | undefined) => {
    if (!endTime) return "";
    const now = new Date().getTime();
    const timeDiff = endTime - now;

    if (timeDiff <= 0) return "Expired";

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getVotingButtonText = (
    state: VotingState,
    voteType: "for" | "against",
  ) => {
    switch (state) {
      case "voting":
        return "Submitting...";
      case "confirming":
        return "Confirming...";
      case "success":
        return "Success!";
      case "error":
        return "Failed";
      default:
        return voteType === "for" ? "Vote For" : "Vote Against";
    }
  };

  const getExecutionButtonText = (state: ExecutionState) => {
    switch (state) {
      case "executing":
        return "Executing...";
      case "executed":
        return "Executed";
      case "error":
        return "Failed";
      default:
        return "Execute";
    }
  };

  const getButtonClass = (
    proposalId: number,
    buttonType: "for" | "against",
  ) => {
    const userVote = userVotes[proposalId];
    const isDisabled = isButtonDisabled(proposalId);

    if (userVote?.hasVoted) {
      const isSelectedChoice =
        (buttonType === "for" && userVote.voteChoice === true) ||
        (buttonType === "against" && userVote.voteChoice === false);

      if (isSelectedChoice) {
        return buttonType === "for"
          ? "px-4 py-2 rounded-md text-sm bg-green-700 text-white border-2 border-green-800 font-semibold"
          : "px-4 py-2 rounded-md text-sm bg-red-700 text-white border-2 border-red-800 font-semibold";
      } else {
        return "px-4 py-2 rounded-md text-sm bg-gray-300 text-gray-500 cursor-not-allowed";
      }
    }

    // Vote status still loading from API — pulse to indicate pending
    if (userVote === undefined) {
      return "px-4 py-2 rounded-md text-sm bg-gray-200 text-gray-400 cursor-not-allowed animate-pulse";
    }

    if (isDisabled) {
      return "px-4 py-2 rounded-md text-sm bg-gray-300 text-gray-600 cursor-not-allowed";
    }

    return buttonType === "for"
      ? "px-4 py-2 rounded-md transition-colors text-sm bg-green-600 text-white hover:bg-green-700"
      : "px-4 py-2 rounded-md transition-colors text-sm bg-red-600 text-white hover:bg-red-700";
  };

  const getExecutionButtonClass = (proposalId: number) => {
    const state = executionStates[proposalId] || "idle";

    switch (state) {
      case "executing":
        return "px-4 py-2 bg-blue-400 text-white rounded-md cursor-not-allowed text-sm";
      case "executed":
        return "px-4 py-2 bg-green-600 text-white rounded-md cursor-not-allowed text-sm";
      case "error":
        return "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm";
      default:
        return "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm";
    }
  };

  // Disabled when: actively voting, user has voted, or vote status not yet fetched from API.
  // localStorage is loaded on mount so a previously-voted proposal will have
  // userVote.hasVoted === true immediately, before any API call completes.
  const isButtonDisabled = (proposalId: number) => {
    const state = votingStates[proposalId] || "idle";
    const userVote = userVotes[proposalId];
    return (
      state !== "idle" || userVote?.hasVoted === true || userVote === undefined
    );
  };

  const isExecutionButtonDisabled = (proposalId: number) => {
    const state = executionStates[proposalId] || "idle";
    return state === "executing" || state === "executed";
  };

  if (proposalsLoading)
    return <p className="text-gray-500">Loading proposals...</p>;

  return (
    <div className="max-w-4xl mx-auto">
      {displayProposals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No proposals found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayProposals.map((proposal) => {
            const proposalId = Number(proposal.id);
            const votingState = votingStates[proposalId] || "idle";
            const executionState = executionStates[proposalId] || "idle";
            const voteError = voteErrors[proposalId];
            const executionError = executionErrors[proposalId];

            return (
              <div
                key={proposal.id}
                className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {proposal.title}
                      </h2>
                      {transactionHashes[proposalId] && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${transactionHashes[proposalId]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#5e00b2] transition-colors flex-shrink-0"
                          title="View transaction on Etherscan"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(proposal.computedStatus)}`}
                      >
                        {(proposal.computedStatus || "active").toUpperCase()}
                      </span>
                      {proposal.executed && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          EXECUTED
                        </span>
                      )}
                      {isProposalExpiringSoon(proposal.endTime) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                          Expiring Soon
                        </span>
                      )}
                      {(proposal.computedStatus === "active" ||
                        proposal.computedStatus === "grace") &&
                        proposal.endTime && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {getTimeRemaining(proposal.endTime)}
                          </span>
                        )}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{proposal.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Proposal ID:</span>{" "}
                        <span className="font-mono">#{proposal.id}</span>
                      </p>
                      {transactionHashes[proposalId] && (
                        <p className="text-sm text-gray-600 mb-1">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${transactionHashes[proposalId]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#5e00b2] hover:text-[#7b2fd6] underline"
                          >
                            View on Etherscan ↗
                          </a>
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Type:</span>{" "}
                        {proposal.proposalType}
                      </p>
                      {proposal.timestamp && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Submitted:</span>{" "}
                          {new Date(proposal.timestamp).toLocaleString()}
                        </p>
                      )}
                      {proposal.endTime && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Voting Ends:</span>{" "}
                          {new Date(proposal.endTime).toLocaleString()}
                        </p>
                      )}
                      {proposal.graceEndTime &&
                        proposal.computedStatus === "grace" && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">
                              Grace Period Ends:
                            </span>{" "}
                            {new Date(proposal.graceEndTime).toLocaleString()}
                          </p>
                        )}
                    </div>

                    {(proposal.votesFor !== undefined ||
                      proposal.votesAgainst !== undefined) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Voting Results:</span>
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-600 font-medium">
                              For:
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {(
                                Number(proposal.votesFor) / 10 ** 18 || 0
                              ).toFixed(2)}{" "}
                              votes
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-red-600 font-medium">
                              Against:
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {(
                                Number(proposal.votesAgainst) / 10 ** 18 || 0
                              ).toFixed(2)}{" "}
                              votes
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm text-gray-700 font-medium">
                              Total Votes:
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {(
                                (Number(proposal.votesFor) / 10 ** 18 || 0) +
                                (Number(proposal.votesAgainst) / 10 ** 18 || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                          {proposal.quorum && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">
                                Quorum Required:
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {proposal.quorum}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {proposal.votesFor !== undefined &&
                    proposal.votesAgainst !== undefined && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                          <span>Vote Distribution</span>
                          <span>
                            {(
                              (Number(proposal.votesFor) / 10 ** 18 || 0) +
                              (Number(proposal.votesAgainst) / 10 ** 18 || 0)
                            ).toFixed(2)}{" "}
                            total votes
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden shadow-inner">
                          <div
                            className="bg-green-500 h-4 flex items-center justify-center"
                            style={{
                              width: `${((Number(proposal.votesFor) / 10 ** 18 || 0) / Math.max((Number(proposal.votesFor) / 10 ** 18 || 0) + (Number(proposal.votesAgainst) / 10 ** 18 || 0), 1)) * 100}%`,
                            }}
                          >
                            {((Number(proposal.votesFor) / 10 ** 18 || 0) /
                              Math.max(
                                (Number(proposal.votesFor) / 10 ** 18 || 0) +
                                  (Number(proposal.votesAgainst) / 10 ** 18 ||
                                    0),
                                1,
                              )) *
                              100 >
                              10 && (
                              <span className="text-xs font-bold text-white">
                                {Math.round(
                                  ((Number(proposal.votesFor) / 10 ** 18 || 0) /
                                    Math.max(
                                      (Number(proposal.votesFor) / 10 ** 18 ||
                                        0) +
                                        (Number(proposal.votesAgainst) /
                                          10 ** 18 || 0),
                                      1,
                                    )) *
                                    100,
                                )}
                                %
                              </span>
                            )}
                          </div>
                          <div
                            className="bg-red-500 h-4 flex items-center justify-center"
                            style={{
                              width: `${((Number(proposal.votesAgainst) / 10 ** 18 || 0) / Math.max((Number(proposal.votesFor) / 10 ** 18 || 0) + (Number(proposal.votesAgainst) / 10 ** 18 || 0), 1)) * 100}%`,
                            }}
                          >
                            {((Number(proposal.votesAgainst) / 10 ** 18 || 0) /
                              Math.max(
                                (Number(proposal.votesFor) / 10 ** 18 || 0) +
                                  (Number(proposal.votesAgainst) / 10 ** 18 ||
                                    0),
                                1,
                              )) *
                              100 >
                              10 && (
                              <span className="text-xs font-bold text-white">
                                {Math.round(
                                  ((Number(proposal.votesAgainst) / 10 ** 18 ||
                                    0) /
                                    Math.max(
                                      (Number(proposal.votesFor) / 10 ** 18 ||
                                        0) +
                                        (Number(proposal.votesAgainst) /
                                          10 ** 18 || 0),
                                      1,
                                    )) *
                                    100,
                                )}
                                %
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs font-medium mt-2">
                          <span className="text-green-600">
                            For:{" "}
                            {(
                              Number(proposal.votesFor) / 10 ** 18 || 0
                            ).toFixed(2)}{" "}
                            (
                            {Math.round(
                              ((Number(proposal.votesFor) / 10 ** 18 || 0) /
                                Math.max(
                                  (Number(proposal.votesFor) / 10 ** 18 || 0) +
                                    (Number(proposal.votesAgainst) / 10 ** 18 ||
                                      0),
                                  1,
                                )) *
                                100,
                            )}
                            %)
                          </span>
                          <span className="text-red-600">
                            Against:{" "}
                            {(
                              Number(proposal.votesAgainst) / 10 ** 18 || 0
                            ).toFixed(2)}{" "}
                            (
                            {Math.round(
                              ((Number(proposal.votesAgainst) / 10 ** 18 || 0) /
                                Math.max(
                                  (Number(proposal.votesFor) / 10 ** 18 || 0) +
                                    (Number(proposal.votesAgainst) / 10 ** 18 ||
                                      0),
                                  1,
                                )) *
                                100,
                            )}
                            %)
                          </span>
                        </div>
                      </div>
                    )}

                  {proposal.computedStatus === "grace" && (
                    <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-sm text-yellow-800">
                        Voting has ended. This proposal is in its grace period
                        where final results are being processed.
                      </p>
                    </div>
                  )}

                  {voteError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      <p className="text-sm text-red-800">{voteError}</p>
                    </div>
                  )}

                  {executionError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      <p className="text-sm text-red-800">{executionError}</p>
                    </div>
                  )}

                  {proposal.computedStatus === "active" && storedWallet && (
                    <div className="flex flex-col space-y-3">
                      {userVotes[proposalId]?.hasVoted &&
                      votingState === "idle" ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-3">
                            <button
                              disabled={true}
                              className={getButtonClass(proposalId, "for")}
                            >
                              {userVotes[proposalId]?.voteChoice === true
                                ? "✓ Voted For"
                                : "Vote For"}
                            </button>
                            <button
                              disabled={true}
                              className={getButtonClass(proposalId, "against")}
                            >
                              {userVotes[proposalId]?.voteChoice === false
                                ? "✓ Voted Against"
                                : "Vote Against"}
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-green-600">
                              ✓ Your vote:{" "}
                              {userVotes[proposalId]?.voteChoice
                                ? "FOR"
                                : "AGAINST"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-3">
                          <button
                            onClick={() =>
                              handleVote(
                                proposalId,
                                true,
                                storedWallet,
                                dao.DAOID,
                              )
                            }
                            disabled={isButtonDisabled(proposalId)}
                            className={getButtonClass(proposalId, "for")}
                          >
                            {getVotingButtonText(votingState, "for")}
                          </button>
                          <button
                            onClick={() =>
                              handleVote(
                                proposalId,
                                false,
                                storedWallet,
                                dao.DAOID,
                              )
                            }
                            disabled={isButtonDisabled(proposalId)}
                            className={getButtonClass(proposalId, "against")}
                          >
                            {getVotingButtonText(votingState, "against")}
                          </button>
                        </div>
                      )}

                      {votingState === "voting" && (
                        <p className="text-sm text-blue-600">
                          📤 Submitting your vote...
                        </p>
                      )}
                      {votingState === "confirming" && (
                        <p className="text-sm text-orange-600">
                          ⏳ Waiting for blockchain confirmation...
                        </p>
                      )}
                      {votingState === "success" && (
                        <p className="text-sm text-green-600">
                          ✅ Vote confirmed successfully!
                        </p>
                      )}
                    </div>
                  )}

                  {proposal.computedStatus === "passed" &&
                    !shouldReturn &&
                    !proposal.executed && (
                      <div>
                        {blockingProposalId[proposalId] && (
                          <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                            <p className="text-sm text-orange-800">
                              ⚠️ Proposal #{blockingProposalId[proposalId]} must
                              be executed first
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() =>
                            handleIssueExecution(
                              dao.DAOID,
                              proposalId,
                              proposal.proposalType,
                              proposal.proposalAction!,
                            )
                          }
                          disabled={
                            isExecutionButtonDisabled(proposalId) ||
                            !canExecuteProposal(proposalId)
                          }
                          className={
                            blockingProposalId[proposalId]
                              ? "px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed text-sm"
                              : getExecutionButtonClass(proposalId)
                          }
                        >
                          {blockingProposalId[proposalId]
                            ? "Blocked - Execute Previous Proposal"
                            : getExecutionButtonText(executionState)}
                        </button>

                        {executionState === "executing" && (
                          <p className="text-sm text-blue-600 mt-2">
                            ⚙️ Executing proposal...
                          </p>
                        )}
                      </div>
                    )}

                  {proposal.computedStatus === "passed" &&
                    executionState === "executed" && (
                      <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                        <p className="text-sm text-green-800">
                          ✅ This proposal has been executed successfully.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
