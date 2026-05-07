"use client";
import { Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

const Footer = () => {
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
          className="absolute top-10 -left-20 w-96 h-96 opacity-10"
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
          className="absolute -top-10 -right-20 w-80 h-80 opacity-8"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#e9d5ff"
            d="M47.3,-78.7C61.5,-71.2,73.5,-58.4,81.2,-43.2C88.9,-28,92.3,-10.4,89.8,6.1C87.3,22.6,79,38,67.8,50.8C56.6,63.6,42.5,73.8,27,79.5C11.5,85.2,-5.4,86.4,-21.1,82.3C-36.8,78.2,-51.3,68.8,-63.4,56.2C-75.5,43.6,-85.2,27.8,-88.3,10.7C-91.4,-6.4,-87.9,-24.8,-79.1,-40.3C-70.3,-55.8,-56.2,-68.4,-40.7,-75.4C-25.2,-82.4,-8.4,-83.8,7.1,-79.9C22.6,-76,33.1,-86.2,47.3,-78.7Z"
            transform="translate(100 100)"
          />
        </svg>

        <svg
          className="absolute bottom-20 right-1/4 w-96 h-96 opacity-6"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#c084fc"
            d="M41.7,-72.3C54.5,-65.4,65.7,-55.2,73.4,-42.4C81.1,-29.6,85.3,-14.8,84.8,-0.3C84.3,14.2,79.1,28.4,70.8,40.8C62.5,53.2,51.1,63.8,38,71.2C24.9,78.6,10.1,82.8,-4.9,81.7C-19.9,80.6,-35.2,74.2,-48.3,65.3C-61.4,56.4,-72.3,45,-78.8,31.4C-85.3,17.8,-87.4,2,-84.1,-12.7C-80.8,-27.4,-72.1,-41,-60.5,-52C-48.9,-63,-34.4,-71.4,-19.7,-77.1C-5,-82.8,10,-85.8,24.9,-82.9C39.8,-80,28.9,-79.2,41.7,-72.3Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="text-center flex-shrink-0 -mt-12">
                <Link href="/">
                  <div className="hover:opacity-80 transition-opacity">
                    <img
                      src="/images/logo.png"
                      alt="OnChain Education Logo"
                      className="h-40 w-auto"
                    />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#5e00b2] to-[#7b2fd6]"></div>
              Quick Links
            </h3>
            <ul className="space-y-3">
              {[
                { text: "Our Mission", href: "#mission" },
                { text: "Meet the Team", href: "#team" },
                { text: "Project Gallery", href: "#gallery" },
                {
                  text: "License Agreement",
                  href: "/end-user-licence-agreement",
                },
              ].map(({ text, href }, i) => (
                <li key={i}>
                  <a
                    href={href}
                    className="group flex items-center gap-3 text-gray-700 hover:text-[#5e00b2] transition-all duration-300 hover:translate-x-1 font-medium"
                  >
                    <ArrowRight
                      size={16}
                      className="text-purple-400 group-hover:text-[#5e00b2] transition-colors"
                    />
                    {text}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#5e00b2] to-[#7b2fd6]"></div>
              Get In Touch
            </h3>

            <div className="space-y-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                Contact us for a free consultation to discuss your Blockchain
                education needs.
              </p>

              {/* Email */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200">
                    <Mail size={16} className="text-[#5e00b2]" />
                  </div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">
                    Email
                  </p>
                </div>
                <a
                  href="mailto:team@onchaineducation.org"
                  className="text-sm text-gray-800 hover:text-[#5e00b2] transition-colors font-medium block mb-2"
                >
                  team@onchaineducation.org
                </a>
                <button
                  onClick={(event) => {
                    navigator.clipboard.writeText("team@onchaineducation.org");
                    const message =
                      event.currentTarget.parentElement?.querySelector(
                        ".copy-message",
                      );
                    if (message) {
                      message.classList.remove("opacity-0");
                      message.classList.add("opacity-100");
                      setTimeout(() => {
                        message.classList.remove("opacity-100");
                        message.classList.add("opacity-0");
                      }, 2000);
                    }
                  }}
                  className="flex items-center gap-2 text-xs text-[#5e00b2] hover:text-[#4a0090] transition-colors font-semibold"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy email
                  <span className="copy-message text-purple-400 opacity-0 transition-opacity duration-300">
                    ✓ Copied
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 border-purple-200 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="text-sm text-gray-700 font-medium">
              © 2026 OnChain Education. All rights reserved.
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="w-2 h-2 bg-[#5e00b2] rounded-full animate-pulse"></div>
              <p className="text-gray-700 font-medium">NZBN: 9429052911941</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Wave */}
      <div className="h-2 bg-gradient-to-r from-[#5e00b2] via-[#7b2fd6] to-[#5e00b2]"></div>
    </footer>
  );
};

export default Footer;
