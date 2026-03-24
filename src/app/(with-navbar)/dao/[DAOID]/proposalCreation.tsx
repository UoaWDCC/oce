"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  UserMinus,
  Coins,
  Vote,
  Settings,
  CircleDollarSign,
} from "lucide-react";
import { WalletInfo } from "./types";

interface StudentInfo {
  Wallet: WalletInfo[];
  UID: string;
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
}

interface ProposalsProps {
  daoData?: DAO | null;
  currentUser?: StudentInfo | null;
}

const ProposalCreation: React.FC<ProposalsProps> = ({
  daoData,
  currentUser: propCurrentUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUserMember, setIsUserMember] = useState(false);

  const router = useRouter();

  const performMembershipCheck = useCallback((dao: DAO, user: StudentInfo) => {
    try {
      const userWalletAddresses = user.Wallet
        ? user.Wallet.map((wallet: WalletInfo) =>
            wallet.walletAddress.toLowerCase(),
          )
        : [];

      if (userWalletAddresses.length === 0) {
        setIsUserMember(false);
        setLoading(false);
        return;
      }

      let matchedWalletAddress: string | null = null;

      const isMember =
        dao.Members?.members?.some((member) => {
          const memberAddress = member.address.toLowerCase();
          const isMatch = userWalletAddresses.includes(memberAddress);
          if (isMatch) {
            matchedWalletAddress = memberAddress;
          }
          return isMatch;
        }) || false;

      const isShaman =
        dao.Members?.shamans?.some((shaman) => {
          const shamanAddress = shaman.address.toLowerCase();
          const isMatch = userWalletAddresses.includes(shamanAddress);
          return isMatch;
        }) || false;

      const membershipStatus = isMember || isShaman;
      setIsUserMember(membershipStatus);
      setLoading(false);

      if (membershipStatus && matchedWalletAddress) {
        localStorage.setItem("selectedWallet", matchedWalletAddress);
      } else {
        localStorage.removeItem("selectedWallet");
      }
    } catch (error) {
      console.error("Error in membership check:", error);
      setIsUserMember(false);
      setLoading(false);
    }
  }, []);

  const checkUserMembership = useCallback(() => {
    try {
      if (daoData && propCurrentUser) {
        performMembershipCheck(daoData, propCurrentUser);
        return;
      }
      setIsUserMember(false);
      setLoading(false);
    } catch (error) {
      console.error("Error checking user membership:", error);
      setLoading(false);
    }
  }, [daoData, propCurrentUser, performMembershipCheck]);

  useEffect(() => {
    checkUserMembership();
  }, [checkUserMembership]);

  const handleGoToCreation = (proposalType: string) => {
    if (!daoData?.DAOID) {
      console.error("DAO address/ID is missing");
      return;
    }
    router.push(
      `/dao/proposals/creation?type=${encodeURIComponent(proposalType)}&dao=${encodeURIComponent(daoData.DAOID)}`,
    );
  };

  const proposalTypes = [
    {
      type: "SIGNAL",
      title: "Signal Request",
      description: "Request an onchain member vote",
      icon: Vote,
      color: "from-[#5e00b2] to-[#7b2fd6]",
    },
    {
      type: "ISSUE",
      title: "DAO Token Request",
      description: "Request voting or non-voting tokens from the DAO",
      icon: Coins,
      color: "from-[#7b2fd6] to-indigo-600",
    },
    {
      type: "GUILDKICK",
      title: "Remove Member",
      description: "Change a member's voting tokens into non-voting tokens",
      icon: UserMinus,
      color: "from-pink-600 to-red-500",
    },
    {
      type: "UPDATE_GOV_SETTINGS",
      title: "Update Governance Settings",
      description: "Change proposal timing or advanced governance settings",
      icon: Settings,
      color: "from-[#5e00b2] to-violet-600",
    },
    {
      type: "TREASURY_WITHDRAWL",
      title: "Treasury Withdrawl",
      description: "Withdraw Ethereum from the DAO Treasury",
      icon: CircleDollarSign,
      color: "from-[#5e00b2] to-violet-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5e00b2]"></div>
      </div>
    );
  }

  return (
    <div className="mb-6 md:mb-8">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 md:mb-6">
        {isUserMember ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            New Proposal
          </button>
        ) : (
          <div className="w-full sm:w-auto px-3 md:px-4 py-2 bg-gray-100 rounded-xl border border-gray-200 text-center">
            <p className="text-gray-600 text-xs md:text-sm font-medium">
              Members only - Join to create proposals
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-purple-100">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] px-4 sm:px-8 py-4 sm:py-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Create New Proposal
                  </h2>
                  <p className="text-purple-100 mt-1 text-xs sm:text-sm">
                    Choose the type of proposal you want to create
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-8">
              <div className="grid gap-3 sm:gap-4">
                {proposalTypes.map((proposal) => {
                  const IconComponent = proposal.icon;
                  return (
                    <button
                      key={proposal.type}
                      className="group w-full text-left p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-white hover:from-purple-100 hover:to-purple-50 border-2 border-purple-100 hover:border-[#5e00b2] rounded-xl sm:rounded-2xl transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1"
                      onClick={() => {
                        handleGoToCreation(proposal.type);
                        setIsModalOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`p-2 sm:p-3 bg-gradient-to-r ${proposal.color} rounded-lg sm:rounded-xl shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0`}
                        >
                          <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 group-hover:text-[#5e00b2] transition-colors">
                            {proposal.title}
                          </h3>
                          <p className="text-gray-600 text-xs sm:text-sm">
                            {proposal.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                          <div className="p-2 bg-[#5e00b2] rounded-lg">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer Note */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 text-xs sm:text-sm">
                  <span className="font-semibold">Note:</span> All proposals
                  require member voting and follow the DAO's governance
                  settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalCreation;
