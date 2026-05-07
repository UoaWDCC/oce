"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Globe, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface RoleData {
  Role: string;
  CourseID: string | null;
}

// Language Switcher Component
const LanguageSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "zh-CN", name: "中文", flag: "🇨🇳" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  ];

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !document.getElementById("google-translate-script")
    ) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).googleTranslateElementInit = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (google?.translate?.TranslateElement) {
          new google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,es,fr,de,zh-CN,ja,ko,pt,ar,hi",
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            "google_translate_element",
          );

          setTimeout(() => {
            setIsLoaded(true);
          }, 1000);
        }
      };
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    if (!isLoaded) {
      alert("Translation is loading, please try again in a moment");
      return;
    }

    const cookieName = "googtrans";
    const domain = window.location.hostname;
    const cookieValue = `/en/${langCode}`;

    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`;

    document.cookie = `${cookieName}=${cookieValue}; path=/; domain=${domain}`;
    document.cookie = `${cookieName}=${cookieValue}; path=/; domain=.${domain}`;

    window.location.reload();
  };

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }}></div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 rounded-xl text-gray-700 
                     hover:text-[#5e00b2] hover:bg-purple-50 transition-all duration-300
                     hover:shadow-lg font-semibold px-4 py-2.5"
          title="Language"
        >
          <Globe className="w-5 h-5" />
          <span className="text-base">Language</span>
          <span className="text-xs">▾</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            <div
              className="absolute right-0 top-full mt-2 w-56 bg-white backdrop-blur-md 
                          border-2 border-purple-200 rounded-2xl p-2 shadow-2xl z-50 max-h-96 overflow-y-auto"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl 
                           hover:bg-purple-50 text-gray-700 hover:text-[#5e00b2] 
                           transition-all duration-200 text-left font-medium"
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const PortalNavbar: React.FC = () => {
  const supabase = createClient();
  const [userRole, setUserRole] = useState<
    "admin" | "tutor" | "student" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchUserRole = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("UserRoles")
        .select("Role, CourseID")
        .eq("UID", user.id);

      if (roleData && roleData.length > 0) {
        const hasAdmin = (roleData as RoleData[]).some(
          (r) => r.Role === "admin" || r.CourseID === "ALL",
        );

        if (hasAdmin) {
          setUserRole("admin");
        } else {
          const hasTutor = (roleData as RoleData[]).some(
            (r) => r.Role === "tutor",
          );
          if (hasTutor) {
            setUserRole("tutor");
          } else {
            setUserRole("student");
          }
        }
      } else {
        setUserRole("student");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("student");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Add global styles to hide Google Translate branding
  useEffect(() => {
    if (typeof window !== "undefined") {
      const style = document.createElement("style");
      style.id = "google-translate-styles";
      style.textContent =
        ".goog-te-banner-frame{display:none!important}body{top:0!important}.goog-te-gadget{font-family:inherit!important}.goog-te-gadget-simple{background-color:transparent!important;border:none!important;padding:0!important;font-size:14px!important}";

      if (!document.getElementById("google-translate-styles")) {
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      sessionStorage.removeItem("authenticated_student");
      localStorage.clear();
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = "/login";
    }
  };

  const canAccessDashboard = userRole === "admin" || userRole === "tutor";

  return (
    <header
      className="bg-white/95 backdrop-blur-md overflow-visible relative z-50 border-b-2 border-purple-200 shadow-xl"
      id="Navbar"
    >
      <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-4 xl:px-10">
        {/* Left side: Logo + Dashboard button */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="relative z-10">
            <Link href="/portal">
              <img
                src="/images/logo.png"
                alt="OnChain Education Logo"
                className="h-16 sm:h-20 w-auto hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>

          {/* Tutor/Admin Dashboard Button - only show for tutors and admins */}
          {!isLoading && canAccessDashboard && (
            <div className="hidden min-[1140px]:flex">
              <Link
                href="/dashboard/tutor"
                className="px-4 py-2 rounded-xl font-semibold text-base transition-all bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white hover:shadow-lg"
              >
                {userRole === "admin" ? "Admin Dashboard" : "Tutor Dashboard"}
              </Link>
            </div>
          )}
        </div>

        {/* Right side: Language + Logout */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 
                       hover:text-red-600 hover:bg-red-50 transition-all duration-300
                       font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Dashboard Button */}
      {!isLoading && canAccessDashboard && (
        <div className="min-[1140px]:hidden px-4 pb-3">
          <Link
            href="/dashboard/tutor"
            className="block w-full text-center px-4 py-2 rounded-xl font-semibold text-base transition-all bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white hover:shadow-lg"
          >
            {userRole === "admin" ? "Admin Dashboard" : "Tutor Dashboard"}
          </Link>
        </div>
      )}
    </header>
  );
};

export default PortalNavbar;
