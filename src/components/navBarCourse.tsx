"use client";
import React from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";

const NavbarCourse: React.FC = () => {
  return (
    <header
      className="bg-white/95 backdrop-blur-md border-b-2 border-purple-200 shadow-xl"
      id="Navbar"
    >
      <div className="flex justify-between items-center h-20 sm:h-24 px-4 sm:px-6 lg:px-8">
        <div className="flex-shrink-0">
          <Link href="/">
            <img
              src="/images/logo.png"
              alt="OnChain Education Logo"
              className="h-16 sm:h-20 w-auto hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>

        <Link
          href="/login"
          className="group relative flex items-center gap-2 sm:gap-3 bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-[#5e00b2] text-gray-900 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-[#5e00b2]" />
          </div>
          {/* Short text on mobile, full text on larger screens */}
          <p className="font-bold text-gray-800 text-sm sm:text-base">
            <span className="sm:hidden">Log in</span>
            <span className="hidden sm:inline">
              Log in to create and view your wallets
            </span>
          </p>
        </Link>
      </div>
    </header>
  );
};

export default NavbarCourse;
