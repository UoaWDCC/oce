"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Jazzicon from "../../../../components/jazzicons";
import {
  SquareArrowOutUpRight,
  Copy,
  Plus,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const DaoList: React.FC = () => {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchDAOs();
  }, []);

  const fetchDAOs = async () => {
    try {
      const { data, error } = await supabase.from("DAO").select("*");

      if (error) {
        console.error("Error fetching DAOs:", error);
        return;
      }

      setDaos(data || []);
    } catch (error) {
      console.error("Error fetching DAOs:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Your DAOs
            </h1>
            <p className="text-purple-600 text-lg">
              Manage and explore your decentralized organizations
            </p>
          </div>

          <Link href="/dao/create">
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Create DAO
            </button>
          </Link>
        </div>

        {/* DAOs Grid */}
        {daos.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-12 max-w-md mx-auto">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                No DAOs Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first DAO to get started with decentralized
                governance
              </p>
              <Link href="/dao/create">
                <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
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
                className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                onClick={() => router.push(`/dao/${dao.DAOID}`)}
              >
                {/* DAO Header */}
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden mr-4 flex-shrink-0">
                    <Jazzicon address={dao.DAOID} diameter={64} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-800 truncate">
                      {dao.Name}
                    </h3>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600 mr-2">
                        {truncateAddress(dao.DAOID)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(dao.DAOID);
                        }}
                        className="relative"
                      >
                        <Copy className="w-4 h-4 text-gray-400 hover:text-purple-600 transition" />
                        {copiedId === dao.DAOID && (
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Copied!
                          </span>
                        )}
                      </button>
                      <Link
                        href={`https://sepolia.etherscan.io/address/${dao.DAOID}`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2"
                      >
                        <SquareArrowOutUpRight className="w-4 h-4 text-gray-400 hover:text-purple-600 transition" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Token Info */}
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-purple-800">
                        {dao.Members.tokens.votingTokenName}
                      </p>
                      <p className="text-xs text-purple-600">
                        {dao.Members.tokens.votingTokenSymbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-800">
                        {dao.Members.members.length} Members
                      </p>
                      <p className="text-xs text-purple-600">
                        {dao.Members.shamans.length} Shamans
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center bg-gray-50 rounded-lg p-3">
                    <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">
                      {dao.Members.members.length}
                    </p>
                    <p className="text-xs text-gray-600">Members</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-3">
                    <FileText className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">0</p>
                    <p className="text-xs text-gray-600">Proposals</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-3">
                    <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">0</p>
                    <p className="text-xs text-gray-600">Active</p>
                  </div>
                </div>

                {/* Governance Info */}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Quorum: {dao.Members.governance.quorum}%</span>
                    <span>
                      Voting: {dao.Members.governance.votingPeriod}min
                    </span>
                  </div>
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
