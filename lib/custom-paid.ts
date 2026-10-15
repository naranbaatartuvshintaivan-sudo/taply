import "server-only";
import sharp from "sharp";
import { customDb } from "./custom-db";
import type { Order } from "./db";
import type { CustomPaidDeps, Photo } from "./fulfil";
import { mockupPath, requestPlatforms } from "./mockup-paths";
import type { Platform } from "./mockups/variants";
import { sendTelegramMediaGroup } from "./telegram";

// Custom захиалга төлөгдөхөд: хүсэлтийг "сонгосон" болгох, Telegram-д сонгосон загвар + эх лого.

/** Сонгосон загварын танилцуулах зураг (захиалсан платформ бүр) + эх лого (PNG болгосон) */
async function chosenPhotos(order: Order): Promise<Photo[]> {
  if (!order.custom_request_id) return [];
  const req = await customDb.getCustomRequest(order.custom_request_id);
  const it = order.items.find((i) => i.design && i.set);
  if (!req || !it?.design || !it.set) return [];
  const set = await customDb.getMockupSet(req.id, it.set);
  if (!set) return [];

  // Захиалсан платформууд (тест захиалгад платформгүй бол хүсэлтийн бүх платформ)
  const ordered = [...new Set(order.items.map((i) => i.platform).filter((p): p is Platform => !!p))];
  const platforms = ordered.length ? ordered : requestPlatforms(req);
  const photos: Photo[] = [];
  for (const p of platforms) {
    const bytes = await customDb.downloadMockup(mockupPath(set.mockup_dir, it.design, p, "preview"));
    photos.push({ bytes, filename: `${it.design}-${p}.png`, type: "image/png" });
  }
  if (req.logo_path) {
    const logo = await customDb.downloadLogo(req.logo_path);
    const png = await sharp(logo).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).png().toBuffer();
    photos.push({ bytes: png, filename: "logo.png", type: "image/png" });
  }
  return photos;
}

export const customPaidDeps = (): CustomPaidDeps => ({
  markChosen: (requestId, design, set) => customDb.markChosen(requestId, design, set),
  photos: chosenPhotos,
  // Цомогт 2–10 зураг; ганц зураг бол давхар явуулна гэж бодохгүй — 1 зурагтай бол хоёр дахь нь лого
  media: async (photos, html) => {
    if (photos.length >= 2) await sendTelegramMediaGroup(photos.slice(0, 10), html);
  },
});
