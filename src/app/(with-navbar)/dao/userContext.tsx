"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { WalletData } from "./types";

interface UserContextType {
  currentUser: number | null;
  setCurrentUser: (id: number | null) => void;
  wallets: WalletData[];
  setWallets: (wallets: WalletData[]) => void;
  selectedWallet: WalletData | null;
  setSelectedWallet: (wallet: WalletData | null) => void;
  newWalletName: string;
  setNewWalletName: (newWalletName: string) => void;
  onSelectWallet: (wallet: WalletData) => void;
  onWalletNameChange: (name: string) => void;
  selectedDAO: string | null;
  setSelectedDAO: (DAO: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<number | null>(null);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [newWalletName, setNewWalletName] = useState<string>("");
  const [selectedDAO, setSelectedDAO] = useState<string | null>(null);

  const onSelectWallet = (wallet: WalletData) => {
    setSelectedWallet(wallet);
  };

  const onWalletNameChange = (name: string) => {
    setNewWalletName(name);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        wallets,
        setWallets,
        selectedWallet,
        setSelectedWallet,
        newWalletName,
        setNewWalletName,
        onSelectWallet,
        onWalletNameChange,
        selectedDAO,
        setSelectedDAO,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
