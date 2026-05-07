export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposalType: string;
  timestamp: number;
  executed?: boolean;
  proposalAction?: {
    sharesTo?: string;
    sharesAmount?: string;
    burnSharesOf?: string;
    vp?: number;
    gp?: number;
    quorum?: number;
    minRet?: number;
    sponThreshold?: number;
    newOffering?: number;
  };
  transactionHash?: string;
  votesFor?: string;
  votesAgainst?: string;
  status?: string;
}

export interface DAO {
  DAOID: string;
  DAOTreasury: string;
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
  Proposals: Proposal[]; // ✅ ADDED THIS!
}

export interface VoteRequest {
  id: number;
  vote: boolean;
  walletAddress: string;
  daoAddress: string;
}

export interface CheckVoteResponse {
  hasVoted: boolean;
  voteChoice?: boolean;
}

export interface WalletInfo {
  walletAddress: string;
  ENS: string;
}
