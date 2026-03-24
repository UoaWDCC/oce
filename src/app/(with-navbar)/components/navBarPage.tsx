import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Subscription } from "@supabase/supabase-js";
import { Menu, X, Globe } from "lucide-react";
import { useLearningModules } from "@/context/LearningModulesProvider";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface WalletInfo {
  publicAddress: string;
  ENS: string;
  ethBalance?: number;
  usdoBalance?: number;
  ethoBalance?: number;
}

interface UserInfo {
  email: string;
  UID: string;
}

interface NavBarProps {
  initialUser: UserInfo;
  initialWallets: WalletInfo[];
}

// Language Switcher Component (keep as is)
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
    // Load Google Translate script
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

      // Initialize Google Translate
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
                     hover:shadow-lg font-semibold px-2 py-2 min-[1440px]:px-4 min-[1440px]:py-2.5"
          title="Language"
        >
          <Globe className="w-5 h-5" />
          <span className="hidden min-[1440px]:inline text-base">Language</span>
          <span className="text-xs">▾</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            <div
              className="absolute left-0 top-full mt-2 w-56 bg-white
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

const Navbar: React.FC<NavBarProps> = ({ initialUser }) => {
  const router = useRouter();

  const { isOpen: isSidebarOpen } = useLearningModules();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>(initialUser);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();
  // Determine which section we're in based on pathname
  const isDefiSection = pathname?.startsWith("/defi");
  const isLearnSection = pathname?.startsWith("/learn");

  // Navigation links based on section
  const daoNavLinks = [
    { href: "/dao/class-daos", label: "Class DAOs" },
    { href: "/dao", label: "Your DAOs" },
    { href: "/learn/glossary", label: "Glossary" },
  ];

  const defiNavLinks = [
    { href: "/defi/dex", label: "DEX" },
    { href: "/defi/lending", label: "Lending" },
    { href: "/defi/nft", label: "NFTs" },
  ];

  const learnNavLinks = [{ href: "/learn/glossary", label: "Glossary" }];

  const getNavLinks = () => {
    if (isDefiSection) return defiNavLinks;
    if (isLearnSection) return learnNavLinks;
    return daoNavLinks;
  };

  const navLinks = getNavLinks();

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

  // Auth setup effect
  useEffect(() => {
    let subscription: Subscription | null = null;
    let isMounted = true;

    const setupAuth = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), 5000),
        );

        const authPromise = supabase.auth.getUser();
        const result = await Promise.race([authPromise, timeoutPromise]);

        if (!isMounted) return;

        const {
          data: { user: verifiedUser },
          error,
        } = result;

        if (verifiedUser && !error) {
          setUser({
            email: verifiedUser.email || "",
            UID: verifiedUser.id,
          });
          sessionStorage.setItem("authenticated_student", "true");
        } else {
          if (initialUser?.UID) {
            setUser(initialUser);
          } else {
            sessionStorage.removeItem("authenticated_student");
            localStorage.clear();
            sessionStorage.removeItem("selectedWallet");
            router.replace("/login");
            return;
          }
        }

        setIsAuthReady(true);

        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;

          if (event === "SIGNED_OUT") {
            sessionStorage.removeItem("authenticated_student");
            localStorage.clear();
            sessionStorage.removeItem("selectedWallet");
            router.replace("/login");
          } else if (event === "TOKEN_REFRESHED" && session?.user) {
            setUser({
              email: session.user.email || "",
              UID: session.user.id,
            });
          }
        });

        subscription = authSubscription;
      } catch (error) {
        console.error("Auth setup error:", error);
        if (!isMounted) return;

        if (initialUser?.UID) {
          setUser(initialUser);
          setIsAuthReady(true);
        } else {
          sessionStorage.removeItem("authenticated_student");
          localStorage.clear();
          sessionStorage.removeItem("selectedWallet");
          router.replace("/login");
        }
      }
    };

    setupAuth();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [initialUser, supabase, router]);

  if (!isAuthReady) {
    return (
      <header
        className="bg-white/95 overflow-x-hidden relative z-50 border-b-2 border-purple-200 shadow-xl transition-all duration-150"
        id="Navbar"
      >
        <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-10">
          <div className="relative z-10">
            <Link href="/">
              <img
                src="/images/logo.png"
                alt="OnChain Education Logo"
                className="h-16 sm:h-20 w-auto"
              />
            </Link>
          </div>
          <div className="text-gray-700 font-semibold">
            <p>Loading...</p>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="bg-white/95 overflow-visible relative z-50 border-b-2 border-purple-200 shadow-xl transition-all duration-150 w-full max-w-full"
      id="Navbar"
    >
      <div className="w-full max-w-full">
        {/* Main navbar row */}
        <div className="flex justify-between items-center h-16 min-[1200px]:h-18 min-[1440px]:h-20 px-3 sm:px-4 min-[1200px]:px-6 min-[1440px]:px-10 max-w-full">
          {/* Logo + Desktop Navigation grouped together on the left */}
          <div className="flex items-center gap-3 min-[1200px]:gap-4 min-[1440px]:gap-8 min-w-0">
            {/* Logo */}
            <div className="relative z-10 flex-shrink-0">
              <Link href="/portal">
                <img
                  src="/images/logo.png"
                  alt="OnChain Education Logo"
                  className="h-12 min-[1200px]:h-14 min-[1440px]:h-20 w-auto hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>

            {/* All Courses Button - always visible on desktop */}
            <div className="hidden min-[1200px]:flex flex-shrink-0">
              <Link
                href="/portal"
                className="px-3 py-1.5 rounded-lg font-semibold text-base transition-all bg-[#5e00b2] text-white whitespace-nowrap"
              >
                All Courses
              </Link>
            </div>

            {/* Desktop Navigation - hide when sidebar is open to prevent squishing */}
            {!isSidebarOpen && (
              <nav className="hidden min-[1200px]:flex items-center gap-1 min-[1440px]:gap-4 font-semibold text-sm min-[1440px]:text-lg min-w-0 overflow-hidden">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-2 min-[1440px]:px-4 py-1.5 min-[1440px]:py-2.5 rounded-xl transition-all whitespace-nowrap ${
                      pathname === link.href
                        ? "text-[#5e00b2] bg-purple-100 shadow-lg"
                        : "text-gray-700 hover:text-[#5e00b2] hover:bg-purple-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right side: Language Switcher + Transfer + Wallet dropdown (desktop) + Mobile menu button */}
          <div className="flex items-center gap-1 min-[1200px]:gap-2 min-[1440px]:gap-3 flex-shrink-0">
            {/* Language Switcher - hide when sidebar is open */}
            {!isSidebarOpen && (
              <div className="hidden min-[1200px]:block">
                <LanguageSwitcher />
              </div>
            )}

            {/* Transfer and Wallet Dropdown - Desktop only */}
            {user && (
              <div className="hidden min-[1200px]:flex items-center gap-1 min-[1440px]:gap-2 relative z-[60]">
                {/* Transfer - hide when sidebar is open */}

                {/* Wallet dropdown - always visible */}
                <div className="relative flex-shrink-0"></div>
              </div>
            )}

            {/* Mobile menu button - shows below 1200px */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-[1200px]:hidden p-2 rounded-xl text-gray-700 hover:text-[#5e00b2] hover:bg-purple-50 transition-colors relative z-[60]"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu - shows below 1200px */}
        {isMobileMenuOpen && (
          <div className="min-[1200px]:hidden border-t-2 border-purple-200 bg-white/95 backdrop-blur-md relative z-[55]">
            <div className="px-4 py-4 space-y-3">
              {/* Portal Button for Mobile */}
              <Link
                href="/portal"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center px-3 py-2.5 rounded-xl font-semibold text-base bg-[#5e00b2] text-white"
              >
                All Courses
              </Link>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block py-2.5 px-4 rounded-xl font-semibold transition-all ${
                      pathname === link.href
                        ? "text-[#5e00b2] bg-purple-100 shadow-md"
                        : "text-gray-700 hover:text-[#5e00b2] hover:bg-purple-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Language Switcher - Mobile */}
              <div className="pt-3 border-t-2 border-purple-200">
                <p className="text-sm text-gray-600 mb-2 px-4 font-semibold">
                  Language
                </p>
                <div className="px-2">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Transfer for mobile */}
              {user && (
                <div className="pt-3 border-t-2 border-purple-200 z-[60]">
                  <p className="text-sm text-gray-600 mb-2 px-4 font-semibold">
                    Transfer
                  </p>
                </div>
              )}

              {/* Wallet Dropdown for mobile */}
              {user && (
                <div className="pt-3 border-t-2 border-purple-200">
                  <p className="text-sm text-gray-600 mb-2 px-4 font-semibold">
                    Your Wallet
                  </p>
                  <div className="px-2"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;