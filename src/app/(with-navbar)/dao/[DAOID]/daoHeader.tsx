"use client";
import Jazzicon from "../../../../components/jazzicons";
import { Copy, SquareArrowOutUpRight } from "lucide-react";
import { DAO } from "./types";

interface DaoHeaderProps {
  dao: DAO;
  copied: boolean;
  handleCopy: () => void;
  truncateAddress: (address: string) => string;
  votingToken: string;
  nonVotingToken: string | null;
  votingTokenName: string;
  votingTokenSymbol: string;
  nonVotingTokenName: string;
  nonVotingTokenSymbol: string;
  isLoadingTokens: boolean;
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

export default function DaoHeader({
  dao,
  copied,
  handleCopy,
  truncateAddress,
  votingToken,
  nonVotingToken,
  votingTokenName,
  votingTokenSymbol,
  nonVotingTokenName,
  nonVotingTokenSymbol,
  isLoadingTokens,
}: DaoHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:justify-between mb-6 lg:mb-8 gap-6 lg:gap-8">
      {/* Left side - DAO Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 flex-1 w-full min-w-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-[120px] lg:h-[120px] rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
          <Jazzicon address={dao.DAOID} diameter={120} />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-3 break-words">
            {dao.Name}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-gray-600 mb-2 lg:mb-0">
            <span className="text-xs sm:text-sm font-mono break-all">
              {truncateAddress(dao.DAOID)}
            </span>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-[#5e00b2] transition-colors flex-shrink-0"
              title="Copy DAO address"
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {copied && (
              <span className="text-xs text-green-600 font-semibold">
                ✓ Copied
              </span>
            )}
            <a
              href={`https://sepolia.etherscan.io/address/${dao.DAOID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#5e00b2] transition-colors flex-shrink-0"
              title="View on Etherscan"
            >
              <SquareArrowOutUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Voting Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 flex-shrink-0 w-full lg:w-auto lg:max-w-[600px]">
        {/* Voting Period */}
        <div className="bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg w-full sm:w-[180px]">
          <h2 className="text-xs sm:text-sm font-semibold opacity-90 mb-1 sm:mb-2">
            Voting Period
          </h2>
          <p className="text-lg sm:text-2xl font-bold">
            {formatTime(dao.Members.governance.votingPeriod)}
          </p>
        </div>

        {/* Voting Token */}
        <div className="bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg w-full sm:w-[180px] overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
            <h2 className="text-xs sm:text-sm font-semibold opacity-90 flex-shrink-0">
              Voting Token
            </h2>
            {!isLoadingTokens && votingToken && (
              <a
                href={`https://sepolia.etherscan.io/token/${votingToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                title="View token on Etherscan"
              >
                <SquareArrowOutUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}
          </div>
          {isLoadingTokens ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-xs opacity-75">Loading...</span>
            </div>
          ) : (
            <p
              className="text-base sm:text-xl font-bold truncate w-full"
              title={
                votingTokenSymbol
                  ? `${votingTokenName} (${votingTokenSymbol})`
                  : `${dao.Members.tokens.votingTokenName} (${dao.Members.tokens.votingTokenSymbol})`
              }
            >
              {votingTokenSymbol
                ? `${votingTokenName} (${votingTokenSymbol})`
                : `${dao.Members.tokens.votingTokenName} (${dao.Members.tokens.votingTokenSymbol})`}
            </p>
          )}
        </div>

        {/* Non-Voting Token */}
        <div className="bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg w-full sm:w-[180px] overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
            <h2 className="text-xs sm:text-sm font-semibold opacity-90 flex-shrink-0">
              Non-Voting Token
            </h2>
            {!isLoadingTokens && nonVotingToken && (
              <a
                href={`https://sepolia.etherscan.io/token/${nonVotingToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                title="View token on Etherscan"
              >
                <SquareArrowOutUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}
          </div>
          {isLoadingTokens ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-xs opacity-75">Loading...</span>
            </div>
          ) : nonVotingToken ? (
            <p
              className="text-base sm:text-xl font-bold truncate w-full"
              title={
                nonVotingTokenSymbol
                  ? `${nonVotingTokenName} (${nonVotingTokenSymbol})`
                  : nonVotingTokenName || "Loot"
              }
            >
              {nonVotingTokenSymbol
                ? `${nonVotingTokenName} (${nonVotingTokenSymbol})`
                : nonVotingTokenName || "Loot"}
            </p>
          ) : (
            <p className="text-base sm:text-xl font-bold">Not Available</p>
          )}
        </div>
      </div>
    </div>
  );
}
