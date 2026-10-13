import { ImageResponse } from "next/og";

export const alt = "TAPLY";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Хар дэвсгэр дээр цагаан TAPLY — нийгмийн сүлжээнд хуваалцахад харагдана
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: 200,
          fontWeight: 800,
          letterSpacing: 36,
          paddingLeft: 36, // letter-spacing-ийн сүүлийн зайг тэнцүүлнэ
        }}
      >
        TAPLY
      </div>
    ),
    size,
  );
}
