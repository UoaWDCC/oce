import { MetadataRoute } from "next";
import { headers } from "next/headers";

const MAIN_DOMAINS = ["onchaineducation.org", "www.onchaineducation.org"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("x-host") || headersList.get("host") || "";

  const isMainDomain = MAIN_DOMAINS.includes(host);

  // Block indexing on non-main domains (oceapi.com, dev, etc.)
  if (!isMainDomain) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  // Allow indexing on main domain
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dao/", "/login", "/register", "/_next/"],
      },
    ],
    sitemap: "https://onchaineducation.org/sitemap.xml",
  };
}
