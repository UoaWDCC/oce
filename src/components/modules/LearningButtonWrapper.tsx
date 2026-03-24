"use client";
import { usePathname } from "next/navigation";
import LearningButton from "@/components/modules/LearningButton";

export default function LearningButtonWrapper() {
  const pathname = usePathname();

  // Determine category based on route
  const getCategory = (): "dao" | "defi" | "basics" | null => {
    if (pathname?.startsWith("/dao")) return "dao";
    if (pathname?.startsWith("/defi")) return "defi";
    if (pathname?.startsWith("/learn")) return "basics";
    return null;
  };

  const category = getCategory();

  if (!category) return null;

  return <LearningButton category={category} />;
}
