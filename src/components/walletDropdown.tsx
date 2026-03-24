import React, { useRef, useState, useEffect } from "react";
import {
  SquareArrowOutUpRight,
  LogOut,
  Copy,
  Tag,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import Jazzicon from "./jazzicons";
import { createClient } from "@/utils/supabase/client";

interface WalletInfo {
  publicAddress: string;
  ENS: string;
  ethBalance?: number;
  usdoBalance?: number;
}

interface WalletDropdownProps {
  userWallets: WalletInfo[];
  selectedWallet: WalletInfo | null;
  newWalletName: string;
  onSelectWallet: (wallet: WalletInfo) => void;
  onWalletNameChange: (name: string) => void;
  onCreateWallet: () => Promise<void>;
  studentId: string;
  isCreating?: boolean;
}

const WalletDropdown: React.FC<WalletDropdownProps> = ({
  userWallets,
  selectedWallet,
  newWalletName,
  onSelectWallet,
  onWalletNameChange,
  onCreateWallet,
  isCreating = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string>("");
  const [ensPopupOpen, setEnsPopupOpen] = useState(false);
  const [TokenSwapPopupOpen, setTokenSwapPopupOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ensPopupOpen) {
        return;
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, ensPopupOpen]);

  const handleLogout = async () => {
    try {
      // Close dropdown immediately to prevent any UI blocking
      setDropdownOpen(false);

      const supabase = createClient();

      // Don't wait for signOut to complete - redirect immediately
      supabase.auth.signOut();

      // Force immediate redirect
      window.location.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      // Still redirect even if there's an error
      window.location.replace("/login");
    }
  };

  const handleENS = () => {
    setEnsPopupOpen(true);
  };

  const handleTokenSwap = () => {
    setTokenSwapPopupOpen(true);
    console.log("TOKEN SWAP POP UP: ", TokenSwapPopupOpen);
  };

  const handleCopy = async (walletAddress: string) => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedId(walletAddress);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCreateWallet = async (
    e:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setError("");

    if (!newWalletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    if (userWallets.length >= 3) {
      setError("You can only have a maximum of 3 wallets");
      return;
    }

    try {
      await onCreateWallet();
      setError("");
    } catch (error) {
      console.error("Wallet creation failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create wallet",
      );
    }
  };

  const getWalletName = (wallet: WalletInfo, index: number) => {
    return wallet.ENS || `Wallet ${index + 1}`;
  };

  const getCurrentBalance = () => {
    if (!selectedWallet) {
      return { eth: "0.0000", usdo: "0.0000" };
    }
    const fresh = userWallets.find(
      (w) => w.publicAddress === selectedWallet.publicAddress,
    );
    return {
      eth: fresh?.ethBalance?.toFixed(5) || "0.0000",
      usdo: fresh?.usdoBalance?.toFixed(5) || "0.0000",
    };
  };

  const getWalletBalance = (wallet: WalletInfo) => {
    return {
      eth: wallet.ethBalance?.toFixed(5) || "0.0000",
      usdo: wallet.usdoBalance?.toFixed(2) || "0.00", // USDO 2 decimals
    };
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        ref={buttonRef}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="group relative flex items-center bg-white hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 text-gray-900 px-4 py-3 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 ease-out min-w-[300px] backdrop-blur-sm"
      >
        {selectedWallet ? (
          <div className="flex items-center justify-between w-full">
            {/* Left side - Jazzicon and wallet info */}
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <Jazzicon
                  address={selectedWallet.publicAddress}
                  diameter={36}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex flex-col items-start text-left">
                <h3 className="font-semibold text-sm text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors">
                  {selectedWallet.ENS || "Unnamed Wallet"}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 font-mono">
                    {selectedWallet.publicAddress.slice(0, 6)}...
                    {selectedWallet.publicAddress.slice(-4)}
                  </span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(selectedWallet.publicAddress);
                    }}
                    className="ml-2 text-gray-400 hover:text-purple-600 transition"
                  >
                    {copiedId === selectedWallet.publicAddress ? (
                      <Copy className=" w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </div>
                  <Link
                    href={`https://sepolia.etherscan.io/address/${selectedWallet.publicAddress}`}
                    target="_blank"
                    className="text-gray-400 hover:text-indigo-600 transition-colors duration-200 p-0.5 rounded hover:bg-indigo-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SquareArrowOutUpRight className="w-4 h-4 mr-2" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right side Balance and dropdown arrow */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium">Balance</p>
                <p className="text-sm font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {getCurrentBalance().eth} ETH
                </p>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <svg
                className={`w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-all duration-300 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-full text-center text-gray-500">
            No wallet selected
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-3 w-[400px] bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 rounded-3xl p-4 z-50 max-h-[600px] overflow-hidden"
        >
          {/* Wallet List */}
          <div className="space-y-2 max-h-[300px] mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
              Your Wallets ({userWallets.length}/3)
            </h3>
            {userWallets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No wallets found</p>
                <p className="text-xs mt-1">Create your first wallet below</p>
              </div>
            ) : (
              userWallets.map((wallet, index) => (
                <div
                  key={wallet.publicAddress}
                  onClick={() => {
                    setDropdownOpen(false);
                    onSelectWallet(wallet);
                  }}
                  className={`group p-4 rounded-2xl cursor-pointer border border-transparent hover:border-indigo-200 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] 
                  ${
                    selectedWallet?.publicAddress === wallet.publicAddress
                      ? "bg-indigo-100 border-2 border-indigo-300"
                      : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left side Jazzicon and wallet info */}
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-shrink-0">
                        <Jazzicon
                          address={wallet.publicAddress}
                          diameter={32}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-gray-400 group-hover:bg-green-400 border-2 border-white rounded-full transition-colors"></div>
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <h3 className="font-semibold text-sm text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors">
                          {getWalletName(wallet, index)}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 group-hover:bg-indigo-100 text-gray-600 group-hover:text-indigo-700 font-mono transition-all">
                            {wallet.publicAddress.slice(0, 6)}...
                            {wallet.publicAddress.slice(-4)}
                          </span>
                          <Link
                            href={`https://sepolia.etherscan.io/address/${wallet.publicAddress}`}
                            target="_blank"
                            className="text-gray-400 hover:text-indigo-600 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SquareArrowOutUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                        <Link
                          href={`https://sepolia.app.ens.domains/${wallet.ENS.toLowerCase().replace(/\s+/g, "-")}.onchaineducation.eth`}
                          target="_blank"
                          className="text-gray-700 text-xs hover:text-indigo-600 transition-colors duration-200 rounded-lg hover:bg-indigo-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Ens
                        </Link>
                      </div>
                    </div>

                    {/* Right side Balance and dropdown arrow */}
                    <div className="flex items-center space-x-4">
                      {/* Balances */}
                      <div className="text-right flex flex-col">
                        {/* First balance (ETH) */}
                        <div>
                          {/* <p className="text-xs text-gray-400 font-medium">ETH Balance</p> */}
                          <p className="text-sm font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                            {getWalletBalance(wallet).eth} ETH
                          </p>
                        </div>
                        <div className="h-px bg-gray-300" />

                        {/* Second balance (USDO) */}
                        <div>
                          {/* <p className="text-xs text-gray-400 font-medium">USDO Balance</p> */}
                          <p className="text-sm font-bold text-gray-900 bg-gradient-to-r group-hover:from-green-600 group-hover:to-emerald-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                            {getWalletBalance(wallet).usdo} USDO
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-10 w-px bg-gray-200"></div>

                      {/* Dropdown arrow */}
                      <svg
                        className={`w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-all duration-300 ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create Wallet Section */}
          {userWallets.length < 3 && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Create New Wallet
                </h3>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter wallet name..."
                  value={newWalletName}
                  onChange={(e) => {
                    setError("");
                    onWalletNameChange(e.target.value);
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateWallet(e);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white/50"
                  disabled={isCreating}
                />
                <button
                  type="button"
                  onClick={handleCreateWallet}
                  disabled={isCreating || !newWalletName.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    "Create Wallet"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Wallet Limit Message */}
          {userWallets.length >= 3 && (
            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 mb-3 mt-10">
              <p className="text-yellow-800 text-sm text-center">
                Maximum wallet limit reached (3/3)
              </p>
            </div>
          )}

          <div className="my-2 h-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex flex-row space-x-5">
            {/* ENS Button */}
            <button
              onClick={handleENS}
              className="flex mt-3 bg-[#0080bc] text-white px-4 py-3 rounded-full w-1/2 shadow-lg hover:bg-[#006999] transition-colors justify-center items-center space-x-2"
            >
              <Tag className="w-5 h-5" />
              <span className="font-medium">Register ENS</span>
            </button>
            <button
              onClick={handleTokenSwap}
              className="flex mt-3 bg-[#0080bc] text-white px-4 py-3 rounded-full w-1/2 shadow-lg hover:bg-[#006999] transition-colors justify-center items-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Token Swap</span>
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex mt-3 bg-red-600 text-white px-4 py-3 rounded-full w-full shadow-lg hover:bg-red-700 transition-colors justify-center items-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletDropdown;
