import type { CustomRequest } from "./custom-db";
import type { DesignKey } from "./mockups/designs/common";
import { variants, type Platform } from "./mockups/variants";

// mockups bucket доторх зам, платформын нэр — хөнгөн модуль (рендэрийн сангуудыг татахгүй).

/** <dir>/A-fb.png (стенд дээрх танилцуулга), <dir>/A-fb-face.png (хэвлэх нүүр) */
export const mockupPath = (dir: string, key: DesignKey, platform: Platform, kind: "preview" | "face") =>
  `${dir}/${key}-${platform}${kind === "face" ? "-face" : ""}.png`;

/** Хүсэлтийн хувилбарууд — загвар бүрт өгсөн платформ бүр (FB, IG дарааллаар) */
export const requestPlatforms = (req: Pick<CustomRequest, "fb_url" | "ig_url">): Platform[] =>
  variants(req.fb_url, req.ig_url).map((v) => v.platform);

export const PLATFORM_LABEL: Record<Platform, string> = { fb: "Facebook", ig: "Instagram" };
