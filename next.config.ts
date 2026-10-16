import type { NextConfig } from "next";

// Аюулгүй байдлын header-ууд — бүх хуудас, API-д.
// CSP: зөвхөн өөрийн домэйн. Next.js inline script ашигладаг тул script-src-д 'unsafe-inline'
// (dev дээр React refresh-д 'unsafe-eval' нэмнэ). frame-ancestors 'none' — clickjacking-ээс.
// Referrer-Policy: /o/<id>, /order?test=1 зэрэг замыг гадны сайт руу (pay.wire.mn г.м.) задруулахгүй.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Захиалгын хуудас хувийн мэдээлэлтэй — хайлтын системд, кэшэд орохгүй
      { source: "/o/:id", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
