// types.ts
export interface WalletData {
  walletAddress: string;
  ENS: string;
  privateKey: string;
}

export interface UserData {
  studentId: number;
  email: string;
  pin: string;
  registeredAt: string;
}

export type Page = "home" | "auth" | "register" | "finance" | "governance";
