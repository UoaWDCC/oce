import { useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Minimal ABI for member-related events
const BAAL_MEMBER_EVENTS_ABI = [
  "event SharesTransferred(address indexed from, address indexed to, uint256 amount)",
  "event LootTransferred(address indexed from, address indexed to, uint256 amount)",
];

interface MemberEventHandlers {
  onSharesChanged?: (member: string) => void;
  onLootChanged?: (member: string) => void;
}

/**
 * Hook to listen for member-related events on the blockchain
 * Automatically updates UI when member shares/loot change
 */
export function useMemberEvents(
  daoAddress: string | null | undefined,
  handlers: MemberEventHandlers,
  enabled: boolean = true,
) {
  const setupListeners = useCallback(async () => {
    if (!daoAddress || !enabled) return;

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
      const contract = new ethers.Contract(
        daoAddress,
        BAAL_MEMBER_EVENTS_ABI,
        provider,
      );

      console.log("🎧 Setting up member event listeners for:", daoAddress);

      // Listen for shares transfers (includes minting)
      if (handlers.onSharesChanged) {
        contract.on(
          "SharesTransferred",
          (from: string, to: string, amount: bigint) => {
            console.log("📊 Shares transferred:", {
              from,
              to,
              amount: amount.toString(),
            });
            // Notify for both sender and receiver
            if (from !== ethers.ZeroAddress) handlers.onSharesChanged?.(from);
            if (to !== ethers.ZeroAddress) handlers.onSharesChanged?.(to);
          },
        );
      }

      // Listen for loot transfers
      if (handlers.onLootChanged) {
        contract.on(
          "LootTransferred",
          (from: string, to: string, amount: bigint) => {
            console.log("💰 Loot transferred:", {
              from,
              to,
              amount: amount.toString(),
            });
            // Notify for both sender and receiver
            if (from !== ethers.ZeroAddress) handlers.onLootChanged?.(from);
            if (to !== ethers.ZeroAddress) handlers.onLootChanged?.(to);
          },
        );
      }

      // Cleanup function
      return () => {
        console.log("🔌 Cleaning up member event listeners");
        contract.removeAllListeners();
      };
    } catch (error) {
      console.error("Error setting up member event listeners:", error);
    }
  }, [daoAddress, enabled, handlers]);

  useEffect(() => {
    const cleanup = setupListeners();
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
    };
  }, [setupListeners]);
}
