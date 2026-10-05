import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      // the service worker must never be cached by the browser/CDN, or updates get stuck
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      // baked model pack: content-hashed filename, safe to cache forever (pack.json always revalidates)
      { source: "/models/:file(pack\\.[a-f0-9]+\\.bin)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/models/pack.json", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] }
    ];
  }
};

export default nextConfig;
