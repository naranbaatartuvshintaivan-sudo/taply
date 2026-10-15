import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Загвар рендэрлэх функцууд assets/fonts/-ийг fs-ээр уншдаг — Vercel-ийн багцад оруулна
  outputFileTracingIncludes: {
    "/api/custom": ["./assets/fonts/**"],
    "/api/admin/custom/[id]/regenerate": ["./assets/fonts/**"],
  },
};

export default nextConfig;
