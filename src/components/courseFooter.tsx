"use client";
import Link from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";

const CourseFooter = () => {
  return (
    <footer
      className="relative text-black overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #faf5ff 30%, #f3e8ff 60%, #e9d5ff 100%)",
      }}
      id="footer"
    >
      {/* Swirly Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute top-10 -left-20 w-80 h-80 opacity-10"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#c084fc"
            d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.1,42.8C64.8,56.4,53.8,69,39.8,76.8C25.8,84.6,8.8,87.6,-7.1,84.7C-23,81.8,-37.9,73,-50.6,61.8C-63.3,50.6,-73.8,36.9,-79.8,21.4C-85.8,5.9,-87.3,-11.4,-82.3,-26.8C-77.3,-42.2,-65.8,-55.7,-51.8,-62.9C-37.8,-70.1,-21.3,-71,-5.1,-63.9C11.1,-56.8,30.6,-83.6,44.7,-76.4Z"
            transform="translate(100 100)"
          />
        </svg>

        <svg
          className="absolute bottom-10 right-1/4 w-80 h-80 opacity-8"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#e9d5ff"
            d="M47.3,-78.7C61.5,-71.2,73.5,-58.4,81.2,-43.2C88.9,-28,92.3,-10.4,89.8,6.1C87.3,22.6,79,38,67.8,50.8C56.6,63.6,42.5,73.8,27,79.5C11.5,85.2,-5.4,86.4,-21.1,82.3C-36.8,78.2,-51.3,68.8,-63.4,56.2C-75.5,43.6,-85.2,27.8,-88.3,10.7C-91.4,-6.4,-87.9,-24.8,-79.1,-40.3C-70.3,-55.8,-56.2,-68.4,-40.7,-75.4C-25.2,-82.4,-8.4,-83.8,7.1,-79.9C22.6,-76,33.1,-86.2,47.3,-78.7Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="relative z-10 border-t-2 border-purple-200">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-7xl mx-auto px-6 py-8">
          <div className="flex-shrink-0">
            <img
              src="/apple-touch-icon.png"
              alt="OnChain Education Logo"
              className="h-20 w-auto"
            />
          </div>
          <div className="text-center md:text-left">
            <p className="text-gray-800 font-bold text-lg md:text-xl">
              Built by{" "}
              <Link
                href="https://Onchaineducation.org"
                className="text-[#5e00b2] hover:text-[#4a0090] underline decoration-2 underline-offset-4 transition-colors"
              >
                OnChain Education
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 border-purple-200 py-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#5e00b2] rounded-full animate-pulse" />
              <p className="text-sm text-gray-700 font-medium">
                © 2026 OnChain Education. All rights reserved.
              </p>
            </div>

            <div className="text-sm text-gray-700 flex items-center gap-1">
              <span>View</span>

              <Link
                href="/end-user-licence-agreement"
                className="text-purple-700 hover:underline inline-flex items-center gap-1"
              >
                End User Licence Agreement
                <SquareArrowOutUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CourseFooter;
