import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://taply.mn"),
  title: "TAPLY — Tap хийвэл дагана",
  description:
    "NFC карт. Утсаа картанд хүргэхэд л таны Instagram, Facebook хуудас нээгдэнэ. Улаанбаатар.",
  openGraph: {
    title: "TAPLY — Tap хийвэл дагана",
    description:
      "Утсаа картанд хүргэхэд л таны Instagram, Facebook хуудас нээгдэнэ.",
    url: "https://taply.mn",
    siteName: "TAPLY",
    locale: "mn_MN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
