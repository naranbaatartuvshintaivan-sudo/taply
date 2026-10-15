import "server-only";
import { randomUUID } from "node:crypto";
import { alert } from "./alert";
import { customDb, type CustomDb, type CustomRequest } from "./custom-db";
import { mockupEmail } from "./custom-email";
import { sendEmail } from "./email";
import { env } from "./env";
import { DESIGN_KEYS, designSet, type DesignKey } from "./mockups/designs";
import { prepareLogo } from "./mockups/logo";
import { renderDesigns, variants, type Platform, type RenderedDesign } from "./mockups/render";
import { siteUrl } from "./site";
import { escapeHtml, sendTelegram, sendTelegramMediaGroup } from "./telegram";

// Шат 2: лого → 3 загвар × платформ (FB/IG, QR шалгасан) → mockups bucket → 'awaiting_approval' → Telegram.
// Админ "Имэйл илгээх" дарахад харилцагч руу имэйл (MOCKUP_AUTO_SEND=true бол шууд).

/** <dir>/A-fb.png (стенд дээрх танилцуулга), <dir>/A-fb-face.png (хэвлэх нүүр) */
export const mockupPath = (dir: string, key: DesignKey, platform: Platform, kind: "preview" | "face") =>
  `${dir}/${key}-${platform}${kind === "face" ? "-face" : ""}.png`;

/** Хүсэлтийн хувилбарууд — загвар бүрт өгсөн платформ бүр (FB, IG дарааллаар) */
export const requestPlatforms = (req: Pick<CustomRequest, "fb_url" | "ig_url">): Platform[] =>
  variants(req.fb_url, req.ig_url).map((v) => v.platform);

export const PLATFORM_LABEL: Record<Platform, string> = { fb: "Facebook", ig: "Instagram" };

// Түлхүүр URL-д ХЭЗЭЭ Ч орохгүй — админ cookie-оор нэвтэрнэ (/admin/login)
export const adminUrl = (base: string, id: string) => `${base.replace(/\/+$/, "")}/admin/custom/${id}`;

export type MockupDeps = {
  db: CustomDb;
  render: (req: CustomRequest, logo: Uint8Array, set: number) => Promise<RenderedDesign[]>;
  notify: (req: CustomRequest, designs: RenderedDesign[], set: number, siteUrl: string) => Promise<void>;
  sendEmail: typeof sendEmail;
  alert: typeof alert;
  autoSend: boolean;
  /** Линкийн суурь — production: taplymn.com, preview: тухайн deployment (lib/site.ts) */
  siteUrl: string;
  newDir: () => string;
};

export const defaultMockupDeps = (): MockupDeps => ({
  db: customDb,
  render: async (req, logo, set) =>
    renderDesigns({ name: req.business_name, logo: await prepareLogo(logo), fbUrl: req.fb_url, igUrl: req.ig_url, set }),
  notify: notifyMockups,
  sendEmail,
  alert,
  autoSend: env().MOCKUP_AUTO_SEND,
  siteUrl: siteUrl(),
  newDir: randomUUID,
});

export type GenerateResult = "done" | "skipped" | "failed";

export type Claimed = { req: CustomRequest; set: number };

/**
 * Загвар үүсгэх эрх авна. initial: хүсэлт ирэхэд (design_set 0 → 1). regenerate: админ
 * "Дахин үүсгэх" (дараагийн багц). Давхар дуудагдвал claimGeneration нэгийг л зөвшөөрнө.
 */
export async function claimMockups(id: string, mode: "initial" | "regenerate", deps: MockupDeps = defaultMockupDeps()): Promise<Claimed | null> {
  const req = await deps.db.getCustomRequest(id);
  if (!req || !req.logo_path) return null;
  const set = await deps.db.claimGeneration(id, req.design_set, mode);
  return set === null ? null : { req, set };
}

export async function generateMockups(id: string, mode: "initial" | "regenerate", deps: MockupDeps = defaultMockupDeps()): Promise<GenerateResult> {
  const c = await claimMockups(id, mode, deps);
  return c ? runMockups(c, deps) : "skipped";
}

/** Рендэр → upload → 'awaiting_approval' → Telegram. Алдаа гарвал 'failed' + ⚠️. */
export async function runMockups({ req, set }: Claimed, deps: MockupDeps = defaultMockupDeps()): Promise<GenerateResult> {
  const id = req.id;
  if (!req.logo_path) return "skipped";
  let designs: RenderedDesign[];
  let dir: string;
  try {
    const logo = await deps.db.downloadLogo(req.logo_path);
    designs = await deps.render(req, logo, set);
    dir = deps.newDir();
    for (const d of designs) {
      await deps.db.uploadMockup(mockupPath(dir, d.key, d.platform, "preview"), d.preview);
      await deps.db.uploadMockup(mockupPath(dir, d.key, d.platform, "face"), d.face);
    }
    if (!(await deps.db.finishGeneration(id, set, dir))) return "skipped"; // шинэ үүсгэлт давж гарсан
  } catch (e) {
    await deps.db.failGeneration(id, set).catch(() => {});
    await deps.alert("Custom загвар", `${req.business_name} · ${adminUrl(deps.siteUrl, id)}`, e);
    return "failed";
  }

  const ready = { ...req, status: "awaiting_approval" as const, design_set: set, mockup_dir: dir };
  try {
    await deps.notify(ready, designs, set, deps.siteUrl);
  } catch (e) {
    await deps.alert("Custom загвар Telegram", req.business_name, e);
  }
  if (deps.autoSend) await sendMockupEmail(id, deps);
  return "done";
}

export type SendResult = "sent" | "not_found" | "already_sent" | "not_ready" | "send_failed";

/** Харилцагч руу 3 загвартай имэйл. 'awaiting_approval' үед л; нэг л удаа (claimSend). */
export async function sendMockupEmail(id: string, deps: MockupDeps = defaultMockupDeps()): Promise<SendResult> {
  const req = await deps.db.getCustomRequest(id);
  if (!req) return "not_found";
  if (req.status !== "awaiting_approval" || !req.mockup_dir) return req.status === "sent" ? "already_sent" : "not_ready";
  if (!(await deps.db.claimSend(id, req.design_set))) return "already_sent";

  const labels = designSet(req.design_set);
  const dir = req.mockup_dir;
  const platforms = requestPlatforms(req);
  const mail = mockupEmail(
    req,
    DESIGN_KEYS.map((k) => ({
      key: k,
      label: labels[k].label,
      images: platforms.map((p) => ({ platform: PLATFORM_LABEL[p], url: deps.db.mockupUrl(mockupPath(dir, k, p, "preview")) })),
    })),
    deps.siteUrl,
  );
  try {
    await deps.sendEmail({ to: req.email, ...mail, idempotencyKey: `custom-mockups-${req.id}-${req.design_set}` });
    return "sent";
  } catch (e) {
    await deps.db.releaseSend(id, req.design_set).catch(() => {});
    await deps.alert("Custom имэйл", req.business_name, e);
    return "send_failed";
  }
}

/** Telegram: танилцуулах зургууд нэг цомогт (3 эсвэл 6, ≤10) + "Админ хуудас" товчтой мессеж. */
async function notifyMockups(req: CustomRequest, designs: RenderedDesign[], set: number, base: string): Promise<void> {
  const e = escapeHtml;
  const keys = DESIGN_KEYS.map((k) => `${k} — ${e(designs.find((d) => d.key === k)?.label ?? "")}`).join(" · ");
  const platforms = [...new Set(designs.map((d) => d.platform))];
  const caption = [
    `🟣 <b>CUSTOM ЗАГВАР</b> · ${e(req.business_name)} · багц ${set}`,
    keys,
    `QR шалгасан ✓ · ${platforms.map((p) => PLATFORM_LABEL[p]).join(" + ")}`,
  ].join("\n");
  await sendTelegramMediaGroup(
    designs.map((d) => ({ bytes: d.preview, filename: `${d.key}-${d.platform}.png`, type: "image/png" })),
    caption,
  );
  await sendTelegram(`Шалгаад имэйл илгээнэ үү · ${e(req.business_name)}`, {
    buttonText: "Админ хуудас",
    buttonUrl: adminUrl(base, req.id),
  });
}
