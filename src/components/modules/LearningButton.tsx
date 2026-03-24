"use client";
import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { useLearningModules } from "@/context/LearningModulesProvider";

interface LearningButtonProps {
  category: "dao" | "defi" | "basics";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export default function LearningButton({
  category,
  position = "top-right",
}: LearningButtonProps) {
  const { openSidebar } = useLearningModules();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": `${hasScrolled ? "top-6" : "top-24"} right-6`,
    "top-left": `${hasScrolled ? "top-6" : "top-24"} left-6`,
  };

  return (
    <button
      onClick={() => openSidebar(category)}
      className={`fixed ${positionClasses[position]} flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold z-30 hover:scale-105`}
    >
      <GraduationCap className="w-5 h-5" />
      <span className="hidden sm:inline">Learning Modules</span>
      <span className="sm:hidden">Learn</span>
    </button>
  );
}
