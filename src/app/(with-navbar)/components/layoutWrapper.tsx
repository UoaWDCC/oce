"use client";
import React from "react";
import Navbar from "./navBarPage";
import { LearningModulesProvider } from "@/context/LearningModulesProvider";

interface WalletInfo {
  publicAddress: string;
  ENS: string;
}

interface UserInfo {
  email: string;
  UID: string;
}

interface LayoutWrapperProps {
  initialUser: UserInfo;
  initialWallets: WalletInfo[];
  children: React.ReactNode;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  initialUser,
  initialWallets,
  children,
}) => {
  return (
    <LearningModulesProvider>
      <div className="w-full max-w-full overflow-x-hidden">
        <Navbar initialUser={initialUser} initialWallets={initialWallets} />
        {children}
      </div>
    </LearningModulesProvider>
  );
};

export default LayoutWrapper;
