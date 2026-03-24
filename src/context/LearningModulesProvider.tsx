"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import ModuleSidebar from "@/components/modules/ModuleSidebar";

type Category = "dao" | "defi" | "basics";

interface LearningModulesContextType {
  openSidebar: (category: Category) => void;
  closeSidebar: () => void;
  isOpen: boolean;
}

const LearningModulesContext = createContext<
  LearningModulesContextType | undefined
>(undefined);

export function LearningModulesProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>("dao");

  const openSidebar = (cat: Category) => {
    setCategory(cat);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <LearningModulesContext.Provider
      value={{ openSidebar, closeSidebar, isOpen }}
    >
      {children}
      <ModuleSidebar
        isOpen={isOpen}
        onClose={closeSidebar}
        category={category}
      />
    </LearningModulesContext.Provider>
  );
}

export function useLearningModules() {
  const context = useContext(LearningModulesContext);
  if (!context) {
    throw new Error(
      "useLearningModules must be used within LearningModulesProvider",
    );
  }
  return context;
}
