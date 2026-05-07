"use client";
import { Users, Shield, Copy, SquareArrowOutUpRight } from "lucide-react";
import { DAO } from "./types";
import { useState, useEffect } from "react";
import Jazzicon from "../../../../components/jazzicons";

interface DaoMembersProps {
  dao: DAO;
  truncateAddress: (address: string) => string;
}

export default function DaoMembers({ dao }: DaoMembersProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    // Safe client-side localStorage read
    const wallet =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedWallet")
        : null;
    if (wallet) setSelectedWallet(wallet.toLowerCase());
  }, []);

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      setTimeout(() => setCopied(""), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Members */}
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#5e00b2] to-[#7b2fd6] rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Members ({dao.Members.members.length})
          </h2>
        </div>
        {dao.Members.members.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm md:text-base">
            No members yet
          </p>
        ) : (
          <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto pr-1 md:pr-2">
            {dao.Members.members.map((m, idx) => {
              const isYou = selectedWallet === m.address.toLowerCase();
              return (
                <div
                  key={idx}
                  className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <Jazzicon address={m.address} diameter={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        {isYou && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 mb-1 md:mb-2">
                        <p className="font-mono text-xs text-gray-600 break-all flex-1">
                          {m.address}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleCopy(m.address)}
                            className="text-gray-400 hover:text-[#5e00b2] transition-colors p-0.5 md:p-1"
                            title="Copy address"
                          >
                            <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </button>
                          <a
                            href={`https://sepolia.etherscan.io/address/${m.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#5e00b2] transition-colors p-0.5 md:p-1"
                            title="View on Etherscan"
                          >
                            <SquareArrowOutUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </a>
                        </div>
                      </div>
                      {copied === m.address && (
                        <span className="text-green-600 text-xs font-semibold mb-1 md:mb-2 block">
                          ✓ Copied
                        </span>
                      )}
                      <div className="flex gap-3 md:gap-4 pt-1.5 md:pt-2 border-t border-purple-100">
                        <span className="text-xs text-gray-600">
                          <span className="font-semibold">Shares:</span>{" "}
                          {m.shares}
                        </span>
                        <span className="text-xs text-gray-600">
                          <span className="font-semibold">Loot:</span> {m.loot}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shamans */}
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-purple-100">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Shamans ({dao.Members.shamans.length})
          </h2>
        </div>
        {dao.Members.shamans.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm md:text-base">
            No shamans configured
          </p>
        ) : (
          <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto pr-1 md:pr-2">
            {dao.Members.shamans.map((s, idx) => {
              const isYou = selectedWallet === s.address.toLowerCase();
              return (
                <div
                  key={idx}
                  className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-sm border border-pink-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <Jazzicon address={s.address} diameter={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        {isYou && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 mb-1 md:mb-2">
                        <p className="font-mono text-xs text-gray-600 break-all flex-1">
                          {s.address}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleCopy(s.address)}
                            className="text-gray-400 hover:text-[#5e00b2] transition-colors p-0.5 md:p-1"
                            title="Copy address"
                          >
                            <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </button>
                          <a
                            href={`https://sepolia.etherscan.io/address/${s.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#5e00b2] transition-colors p-0.5 md:p-1"
                            title="View on Etherscan"
                          >
                            <SquareArrowOutUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </a>
                        </div>
                      </div>
                      {copied === s.address && (
                        <span className="text-green-600 text-xs font-semibold mb-1 md:mb-2 block">
                          ✓ Copied
                        </span>
                      )}
                      <div className="pt-1.5 md:pt-2 border-t border-pink-100">
                        <span className="text-xs text-gray-600">
                          <span className="font-semibold">Permission:</span>{" "}
                          {s.permission}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
