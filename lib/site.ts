// Харилцагч, админ руу явуулах линкийн суурь хаяг — орчноос хамаарна:
//   production → https://taplymn.com
//   preview    → тухайн deployment-ийн өөрийн хаяг (VERCEL_URL) — preview-ийн Telegram товч,
//                имэйлийн линк production руу биш, яг тэр preview руу очно
//   локал      → NEXT_PUBLIC_SITE_URL (эсвэл taplymn.com)
export const PRODUCTION_URL = "https://taplymn.com";

export function siteUrl(e: Record<string, string | undefined> = process.env): string {
  if (e.VERCEL_ENV === "production") return PRODUCTION_URL;
  if (e.VERCEL_ENV === "preview" && e.VERCEL_URL) return `https://${e.VERCEL_URL}`;
  return (e.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/+$/, "");
}
