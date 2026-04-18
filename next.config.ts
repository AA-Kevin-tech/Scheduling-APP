import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  dynamicStartUrl: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url: { pathname } }) =>
          sameOrigin && pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        method: "GET",
        options: {
          cacheName: "apis",
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /** Employee invite emails may include several PDF attachments. */
      bodySizeLimit: "12mb",
    },
  },
};

export default withPWA(nextConfig);
