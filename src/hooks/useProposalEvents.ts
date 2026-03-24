import { useEffect, useRef } from "react";
import { ethers } from "ethers";

// Minimal ABI for the events we need
const BAAL_EVENTS_ABI = [
  "event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, address indexed sponsor, uint256 votingStarts, uint256 votingEnds, uint256 gracePeriodEnds)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool indexed approve, uint256 weight)",
  "event ProposalProcessed(uint256 indexed proposalId, bool passed, bool actionFailed)",
  "event ProposalExecuted(uint256 indexed proposalId, address executor)",
];

interface ProposalEventHandlers {
  onProposalSubmitted?: (proposalId: number) => void;
  onVoteCast?: (
    proposalId: number,
    voter: string,
    approve: boolean,
    weight: string,
  ) => void;
  onProposalProcessed?: (proposalId: number, passed: boolean) => void;
  onProposalExecuted?: (proposalId: number) => void;
}

/**
 * Hook to listen for proposal-related events on the blockchain
 * Automatically updates UI when proposals change state
 *
 */
export function useProposalEvents(
  daoAddress: string | null | undefined,
  handlers: ProposalEventHandlers,
  enabled: boolean = true,
) {
  // Use refs for handlers to avoid re-subscribing when handlers change
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!daoAddress || !enabled) return;

    // Get Infura URL from environment variable (must be prefixed with NEXT_PUBLIC_ for client-side access)
    const infuraUrl = process.env.NEXT_PUBLIC_INFURA_URL;

    if (!infuraUrl) {
      console.warn(
        "⚠️ NEXT_PUBLIC_INFURA_URL not set. Proposal event listeners disabled.",
        "Add NEXT_PUBLIC_INFURA_URL to your .env.local file to enable real-time updates.",
      );
      return;
    }

    let contract: ethers.Contract | null = null;
    let isCleanedUp = false;

    const setupListeners = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(infuraUrl, {
          name: "sepolia",
          chainId: 11155111,
        });

        // Test the connection first
        await provider.getNetwork();

        if (isCleanedUp) return;

        contract = new ethers.Contract(daoAddress, BAAL_EVENTS_ABI, provider);

        console.log("🎧 Setting up proposal event listeners for:", daoAddress);

        // Listen for new proposals
        contract.on("ProposalSubmitted", (proposalId: bigint) => {
          if (isCleanedUp) return;
          console.log("📢 New proposal submitted:", Number(proposalId));
          handlersRef.current.onProposalSubmitted?.(Number(proposalId));
        });

        // Listen for votes
        contract.on(
          "VoteCast",
          (
            proposalId: bigint,
            voter: string,
            approve: boolean,
            weight: bigint,
          ) => {
            if (isCleanedUp) return;
            console.log(
              `🗳️ Vote cast on proposal #${Number(proposalId)}:`,
              approve ? "FOR" : "AGAINST",
            );
            handlersRef.current.onVoteCast?.(
              Number(proposalId),
              voter,
              approve,
              weight.toString(),
            );
          },
        );

        // Listen for proposal processing (voting ended)
        contract.on(
          "ProposalProcessed",
          (proposalId: bigint, passed: boolean) => {
            if (isCleanedUp) return;
            console.log(
              `✅ Proposal #${Number(proposalId)} processed:`,
              passed ? "PASSED" : "REJECTED",
            );
            handlersRef.current.onProposalProcessed?.(
              Number(proposalId),
              passed,
            );
          },
        );

        // Listen for proposal execution
        contract.on("ProposalExecuted", (proposalId: bigint) => {
          if (isCleanedUp) return;
          console.log(`⚡ Proposal #${Number(proposalId)} executed`);
          handlersRef.current.onProposalExecuted?.(Number(proposalId));
        });
      } catch (error) {
        // Don't spam console with errors if it's just a network issue
        if (!isCleanedUp) {
          console.warn("Failed to setup proposal event listeners:", error);
        }
      }
    };

    setupListeners();

    // Cleanup function
    return () => {
      isCleanedUp = true;
      if (contract) {
        console.log("🔌 Cleaning up proposal event listeners");
        contract.removeAllListeners();
      }
    };
  }, [daoAddress, enabled]);
}
