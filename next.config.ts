import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Moved from experimental.serverComponentsExternalPackages (Next.js 15)
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],

  experimental: {
    // Optimize server components
    optimizeServerReact: true,
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Tree shake unused code more aggressively
    if (!dev) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },

  // Output configuration for Cloudflare
  output: "standalone",

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Images optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

// Only init Cloudflare dev context when running locally (not during Vercel builds)
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}
