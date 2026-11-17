import type { Metadata } from "next";
import { Alegreya_SC, Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "../app/(with-navbar)/dao/userContext";
import ClientNavigation from "@/components/clientNavigation";
import { headers } from "next/headers";
import ChatWrapper from "@/features/chatbot/components/chatWrapper";
import QueryProvider from "@/lib/queryClient";
import { FloatingPanelLayoutProvider } from "@/context/FloatingPanelLayoutProvider";

const agreya = Alegreya_SC({
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-alegreya",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const MAIN_DOMAINS = [
  "onchaineducation.org",
  "www.onchaineducation.org, localhost:3000",
];

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("x-host") || headersList.get("host") || "";
  const isMainDomain = MAIN_DOMAINS.includes(host);

  return {
    title: "OnChain Education - Blockchain, Web3 & Crypto Education",
    description:
      "OnChain Education specializes in crypto, Web3, and blockchain education with innovative DAO software for educational courses and research. Empowering the next generation of blockchain professionals.",
    robots: isMainDomain
      ? "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
      : "noindex, nofollow",
    metadataBase: new URL("https://onchaineducation.org/"),
    alternates: {
      canonical: "https://onchaineducation.org/",
    },
    openGraph: {
      locale: "en_US",
      type: "website",
      title: "OnChain Education - Blockchain, Web3 & Crypto Education",
      description:
        "OnChain Education specializes in crypto, Web3, and blockchain education with innovative DAO software for educational courses and research.",
      url: "https://onchaineducation.org/",
      siteName: "OnChain Education",
      images: [
        {
          url: "https://onchaineducation.org/images/thumbnail.jpg",
          width: 1200,
          height: 610,
          alt: "OnChain Education Thumbnail",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "OnChain Education - Blockchain, Web3 & Crypto Education Platform",
      description:
        "Empowering learners with cutting-edge DAO software for educational courses and research in crypto, Web3, and blockchain technology.",
      creator: "@onchain_edu",
      images: ["https://onchaineducation.org/images/thumbnail.jpg"],
    },
    authors: [{ name: "OnChain Education" }],
    keywords: [
      "blockchain education",
      "crypto courses",
      "crypto education",
      "Web3 training",
      "DAO software",
      "governance courses",
      "cryptocurrency education",
      "decentralized education",
      "blockchain development",
      "smart contracts",
      "DeFi education",
      "NFT courses",
    ],
    other: {
      "article:published_time": "2025-01-01T00:00:00+00:00",
      "article:modified_time": "2025-06-12T00:00:00+00:00",
      "twitter:label1": "Services",
      "twitter:data1": "Blockchain Education & DAO Software",
      "twitter:label2": "Specialty",
      "twitter:data2": "Crypto, Web3 & Blockchain Training",
    },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/onchain-logo-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#d946ef" />
        <meta name="msapplication-TileColor" content="#d946ef" />
      </head>
      <body
        className={`${agreya.variable} ${inter.variable} antialiased bg-white`}
      >
        <QueryProvider>
          <UserProvider>
            <FloatingPanelLayoutProvider>
              <ChatWrapper />
              <div className="relative w-full min-h-screen bg-white text-gray-800">
                <ClientNavigation>{children}</ClientNavigation>
              </div>
            </FloatingPanelLayoutProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
