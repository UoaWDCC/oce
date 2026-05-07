"use client";
import { createElement, useState, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import navigation, { isDropdown, getAllMenuItems } from "../config/navigation";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface NavItemProps {
  text: string;
  link?: string;
  icon?: LucideIcon;
  dropdownContent?: React.ReactNode;
}

export interface NavSectionSubItem {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSectionItem {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  hasSubItems?: boolean;
  subItems?: NavSectionSubItem[];
}

export interface NavSection {
  title: string;
  items: NavSectionItem[];
}

export interface NavItem {
  text: string;
  path?: string;
  icon: LucideIcon;
  isDropdown?: boolean;
  sections?: NavSection[];
}

// Google Translate Language Switcher Component
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

          // Wait a bit for the widget to initialize
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

    // Set the Google Translate cookie
    const cookieName = "googtrans";
    const domain = window.location.hostname;
    const cookieValue = `/en/${langCode}`;

    // Delete existing cookie
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`;

    // Set new cookie
    document.cookie = `${cookieName}=${cookieValue}; path=/; domain=${domain}`;
    document.cookie = `${cookieName}=${cookieValue}; path=/; domain=.${domain}`;

    // Reload the page to apply translation
    window.location.reload();
  };

  return (
    <>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: "none" }}></div>

      {/* Custom Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 
                     hover:text-[#5e00b2] hover:bg-purple-50 transition-all duration-300
                     hover:shadow-lg font-semibold"
        >
          <Globe className="w-5 h-5" />
          <span className="hidden lg:inline">Language</span>
          <span className="text-sm">▾</span>
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

const SubDropdownMenu = ({ item }: { item: NavSectionItem }) => {
  if (!item.hasSubItems || !item.subItems?.length) {
    return (
      <a
        href={item.path}
        className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all duration-300 hover:shadow-lg group/item"
      >
        <span className="mt-1 flex-shrink-0 text-[#5e00b2]">
          {createElement(item.icon, { size: 20 })}
        </span>
        <div className="flex-1">
          <span className="text-gray-800 block group-hover/item:text-[#5e00b2] transition-colors text-base font-semibold">
            {item.title}
          </span>
          <span className="text-sm text-gray-600">{item.description}</span>
        </div>
      </a>
    );
  }

  return (
    <div className="relative group/subdropdown">
      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all duration-300 hover:shadow-lg group/item">
        <span className="mt-1 flex-shrink-0 text-[#5e00b2]">
          {createElement(item.icon, { size: 20 })}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-800 block group-hover/item:text-[#5e00b2] transition-colors text-base font-semibold">
              {item.title}
            </span>
            <span className="text-sm transition-transform duration-300 group-hover/subdropdown:rotate-180 text-gray-500">
              ▾
            </span>
          </div>
          <span className="text-sm text-gray-600">{item.description}</span>
        </div>
      </div>

      <div
        className="absolute left-0 top-full w-full min-w-[220px] bg-white backdrop-blur-md 
                  border-2 border-purple-200 rounded-2xl p-3 opacity-0 invisible 
                  group-hover/subdropdown:opacity-100 group-hover/subdropdown:visible transform 
                  translate-y-2 group-hover/subdropdown:translate-y-0 transition-all duration-300
                  shadow-2xl z-50 ml-8"
      >
        {item.subItems?.map((subItem, index) => (
          <a
            key={index}
            href={subItem.path}
            className="block py-2 px-3 my-1 rounded-xl hover:bg-purple-50 transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 text-[#5e00b2]">
                {createElement(subItem.icon, { size: 16 })}
              </span>
              <div>
                <span className="text-gray-800 block hover:text-[#5e00b2] transition-colors text-sm font-semibold">
                  {subItem.title}
                </span>
                <span className="text-xs text-gray-600">
                  {subItem.description}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const NavItem = ({ text, link, dropdownContent }: NavItemProps) => {
  if (dropdownContent) {
    return (
      <div className="relative group">
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 
                       hover:text-[#5e00b2] hover:bg-purple-50 transition-all duration-300
                       hover:shadow-lg font-semibold text-base"
        >
          {text}
          <span className="text-sm transition-transform duration-300 group-hover:rotate-180 text-gray-500">
            ▾
          </span>
        </button>
        <div
          className="absolute right-0 top-full w-[600px] bg-white backdrop-blur-md 
                    border-2 border-purple-200 rounded-2xl p-6 opacity-0 invisible 
                    group-hover:opacity-100 group-hover:visible transform 
                    translate-y-2 group-hover:translate-y-0 transition-all duration-300
                    shadow-2xl z-50 mt-2"
        >
          {dropdownContent}
        </div>
      </div>
    );
  }

  return (
    <a
      href={link || "#"}
      className="px-4 py-2.5 rounded-xl text-gray-700 hover:text-[#5e00b2] hover:bg-purple-50 
                transition-all duration-300 hover:shadow-lg 
                font-semibold flex items-center gap-2 text-base whitespace-nowrap"
    >
      {text}
    </a>
  );
};

const MobileSubMenuItem = ({ item }: { item: NavSectionItem }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!item.hasSubItems || !item.subItems?.length) {
    return (
      <a
        href={item.path}
        className="block px-4 py-2.5 rounded-xl text-gray-600 hover:text-[#5e00b2] 
                    hover:bg-purple-50 transition-colors text-sm
                    flex items-center gap-2 font-medium"
      >
        {createElement(item.icon, {
          size: 16,
          className: "text-[#5e00b2]",
        })}
        {item.title}
      </a>
    );
  }

  return (
    <div className="group/mobile-sub relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl text-gray-600 hover:text-[#5e00b2] 
                    hover:bg-purple-50 transition-colors text-sm
                    flex items-center justify-between font-medium"
      >
        <div className="flex items-center gap-2">
          {createElement(item.icon, {
            size: 16,
            className: "text-[#5e00b2]",
          })}
          {item.title}
        </div>
        <span
          className={`text-xs transition-transform duration-300 text-gray-500 ${isOpen ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="pl-8 border-l-2 border-purple-200 ml-4 mt-1">
          {item.subItems?.map((subItem, index) => (
            <a
              key={index}
              href={subItem.path}
              className="block px-4 py-2 rounded-xl text-gray-600 hover:text-[#5e00b2] 
                                hover:bg-purple-50 transition-colors text-xs
                                flex items-center gap-2"
            >
              {createElement(subItem.icon, {
                size: 14,
                className: "text-[#5e00b2]",
              })}
              {subItem.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const allMenuItems = getAllMenuItems() as Array<
    NavSectionItem & { section?: string }
  >;

  const learnItems = allMenuItems.filter(
    (item) =>
      item.section &&
      ["Crypto Basics", "Advanced Topics"].includes(item.section),
  );

  const mainNavItems = allMenuItems.filter((item) => !item.section);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b-2 border-purple-200 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-25 md:h-18 lg:h-25">
          {/* Logo */}
          <div className="text-center flex-shrink-0 mx-2 md:mx-4">
            <Link href="/">
              <div className="hover:opacity-80 transition-opacity">
                <img
                  src="/images/logo.png"
                  alt="OnChain Education Logo"
                  className="h-30 w-auto"
                />
              </div>
            </Link>
          </div>

          {/* Navigation Container */}
          <div className="flex flex-1 items-center justify-between min-[1200px]:justify-end">
            {/* Desktop Navigation */}
            <div className="hidden min-[1200px]:flex min-[1200px]:items-center min-[1200px]:space-x-2 flex-shrink-0">
              {navigation.map((item, index) => (
                <NavItem
                  key={index}
                  text={item.text}
                  link={isDropdown(item) ? undefined : item.path}
                  dropdownContent={
                    isDropdown(item) && item.sections ? (
                      <div className="grid grid-cols-2 gap-6">
                        {item.sections.map((section, sectionIndex) => (
                          <div key={sectionIndex}>
                            <h3 className="text-[#5e00b2] font-bold mb-4 pl-2 text-base">
                              {section.title}
                            </h3>
                            <div className="space-y-1">
                              {section.items.map((dropdownItem, itemIndex) => (
                                <SubDropdownMenu
                                  key={itemIndex}
                                  item={dropdownItem}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : undefined
                  }
                />
              ))}
              {/* Language Switcher - Desktop */}
              <LanguageSwitcher />
              {/* Student Login Button - Desktop */}
              <Link
                href="/login"
                className="ml-4 px-6 py-2.5 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white 
                         rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 
                         transition-all duration-300 whitespace-nowrap"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="min-[1200px]:hidden flex-shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-xl text-gray-700 hover:text-[#5e00b2] hover:bg-purple-50 transition-colors"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${isMenuOpen ? "block" : "hidden"} min-[1200px]:hidden bg-white/95 backdrop-blur-md border-t-2 border-purple-200`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1">
          {/* Home */}
          {mainNavItems.find((item) => item.title === "Home") && (
            <a
              href={mainNavItems.find((item) => item.title === "Home")?.path}
              className="block px-4 py-2.5 rounded-xl text-gray-700 hover:text-[#5e00b2] 
                             hover:bg-purple-50 transition-colors text-sm sm:text-base
                             flex items-center gap-3 font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              {createElement(
                mainNavItems.find((item) => item.title === "Home")!.icon,
                {
                  className: "text-[#5e00b2]",
                },
              )}
              Home
            </a>
          )}

          {/* Learn Section */}
          {learnItems.length > 0 && (
            <div className="px-4 py-2">
              <div className="font-bold text-[#5e00b2] mb-2 text-sm sm:text-base flex items-center gap-2">
                {createElement(
                  navigation.find((item) => item.text === "Learn")!.icon,
                  {
                    className: "text-[#5e00b2]",
                  },
                )}
                Learn
              </div>
              <div className="pl-4 space-y-2">
                {learnItems.map((item, index) => (
                  <MobileSubMenuItem
                    key={index}
                    item={item as NavSectionItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other sections */}
          {mainNavItems
            .filter((item) => item.title !== "Home")
            .map((item, index) => (
              <a
                key={index}
                href={item.path}
                className="block px-4 py-2.5 rounded-xl text-gray-700 hover:text-[#5e00b2] 
                                 hover:bg-purple-50 transition-colors text-sm sm:text-base
                                 flex items-center gap-3 font-semibold"
                onClick={() => setIsMenuOpen(false)}
              >
                {createElement(item.icon, {
                  size: 18,
                  className: "text-[#5e00b2]",
                })}
                {item.title}
              </a>
            ))}

          {/* Language Switcher - Mobile */}
          <div className="border-t-2 border-purple-200 pt-2 mt-2">
            <LanguageSwitcher />
          </div>

          {/* Student Login Button - Mobile */}
          <div className="pt-2">
            <Link
              href="/login"
              className="block w-full px-6 py-3 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white 
                       text-center rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 
                       transition-all duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
