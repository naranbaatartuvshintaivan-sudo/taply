import { describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({ env: () => ({ NEXT_PUBLIC_SITE_URL: "https://taplymn.com", MOCKUP_AUTO_SEND: false }) }));
vi.mock("./mockups/render", async (orig) => ({ ...(await orig<typeof import("./mockups/render")>()), renderDesigns: async () => [] }));

import type { CustomDb, CustomRequest } from "./custom-db";
import { mockupEmail } from "./custom-email";
import { generateMockups, mockupPath, sendMockupEmail, type MockupDeps } from "./custom-mockups";
import type { RenderedDesign } from "./mockups/render";

const ID = "11111111-1111-1111-1111-111111111111";

const baseReq: CustomRequest = {
  id: ID,
  token: "t".repeat(32),
  business_id: "biz",
  business_name: "Номин <Бутик>",
  contact_name: "Бат",
  email: "bat@x.mn",
  quantity: 2,
  status: "generating",
  chosen_design: null,
  fb_url: "https://www.facebook.com/nomin",
  ig_url: null,
  logo_path: `${ID}/original.png`,
  note: null,
  design_set: 0,
  mockup_dir: null,
  generated_at: null,
  sent_at: null,
  created_at: "now",
  updated_at: "now",
};

const designs: RenderedDesign[] = (["A", "B", "C"] as const).map((key) => ({
  key,
  platform: "fb",
  url: "https://www.facebook.com/nomin",
  label: key,
  face: Buffer.from(`face-${key}`),
  preview: Buffer.from(`preview-${key}`),
}));

// Жинхэнэ DB-гийн нөхцөлт update-ийг дуурайсан санах ойн хувилбар
function setup(over: Partial<MockupDeps> = {}, reqOver: Partial<CustomRequest> = {}) {
  const row: CustomRequest = { ...baseReq, ...reqOver };
  const uploads: string[] = [];
  const alerts: string[] = [];
  const emails: { to: string; subject: string; idempotencyKey: string }[] = [];
  const notified: string[] = [];
  const db: Partial<CustomDb> = {
    getCustomRequest: async () => ({ ...row }),
    downloadLogo: async () => new Uint8Array([1]),
    claimGeneration: async (_id, fromSet, mode) => {
      const ok = row.design_set === fromSet && (mode === "initial" ? row.status === "generating" : ["awaiting_approval", "sent", "failed"].includes(row.status));
      if (!ok) return null;
      row.design_set = fromSet + 1;
      row.status = "generating";
      return row.design_set;
    },
    uploadMockup: async (path) => void uploads.push(path),
    finishGeneration: async (_id, set, dir) => {
      if (row.design_set !== set || row.status !== "generating") return false;
      Object.assign(row, { status: "awaiting_approval", mockup_dir: dir });
      return true;
    },
    failGeneration: async (_id, set) => {
      if (row.design_set === set && row.status === "generating") row.status = "failed";
    },
    claimSend: async (_id, set) => {
      if (row.design_set !== set || row.status !== "awaiting_approval") return false;
      row.status = "sent";
      return true;
    },
    releaseSend: async () => void (row.status = "awaiting_approval"),
    mockupUrl: (p) => `https://cdn/${p}`,
  };
  const deps: MockupDeps = {
    db: db as CustomDb,
    render: async () => designs,
    notify: async (_r, _d, set, base) => void notified.push(`${set}@${base}`),
    sendEmail: async (p) => void emails.push(p),
    alert: async (where) => void alerts.push(where),
    autoSend: false,
    siteUrl: "https://taplymn.com",
    newDir: () => "dir-1",
    ...over,
  };
  return { deps, row, uploads, alerts, emails, notified };
}

describe("generateMockups", () => {
  it("эхний удаа: багц 1, 6 зураг upload, 'awaiting_approval', Telegram, имэйл явуулахгүй", async () => {
    const s = setup();
    expect(await generateMockups(ID, "initial", s.deps)).toBe("done");
    expect(s.row).toMatchObject({ status: "awaiting_approval", design_set: 1, mockup_dir: "dir-1" });
    expect(s.uploads).toEqual(["dir-1/A-fb.png", "dir-1/A-fb-face.png", "dir-1/B-fb.png", "dir-1/B-fb-face.png", "dir-1/C-fb.png", "dir-1/C-fb-face.png"]);
    expect(s.notified).toEqual(["1@https://taplymn.com"]); // siteUrl нь deps-ээс (preview бол тухайн хаяг)
    expect(s.emails).toHaveLength(0);
  });

  it("MOCKUP_AUTO_SEND=true бол шууд имэйл", async () => {
    const s = setup({ autoSend: true });
    await generateMockups(ID, "initial", s.deps);
    expect(s.emails).toHaveLength(1);
    expect(s.row.status).toBe("sent");
  });

  it("QR/рендэр алдаа → 'failed', ⚠️ alert, upload/Telegram/имэйл байхгүй", async () => {
    const s = setup({ render: async () => { throw new Error("QR таарахгүй"); }, autoSend: true });
    expect(await generateMockups(ID, "initial", s.deps)).toBe("failed");
    expect(s.row.status).toBe("failed");
    expect(s.alerts).toEqual(["Custom загвар"]);
    expect(s.uploads).toEqual([]);
    expect(s.notified).toEqual([]);
    expect(s.emails).toEqual([]);
  });

  it("дахин үүсгэх: дараагийн багц, шинэ хавтас", async () => {
    const s = setup({ newDir: () => "dir-2" }, { status: "awaiting_approval", design_set: 1, mockup_dir: "dir-1" });
    expect(await generateMockups(ID, "regenerate", s.deps)).toBe("done");
    expect(s.row).toMatchObject({ status: "awaiting_approval", design_set: 2, mockup_dir: "dir-2" });
  });

  it("сонгогдсон эсвэл одоо үүсгэж буй хүсэлтийг дахин үүсгэхгүй", async () => {
    for (const status of ["chosen", "generating"] as const) {
      const s = setup({}, { status, design_set: 1 });
      expect(await generateMockups(ID, "regenerate", s.deps)).toBe("skipped");
      expect(s.uploads).toEqual([]);
    }
  });

  it("логогүй хүсэлт → skipped", async () => {
    const s = setup({}, { logo_path: null, status: "manual" });
    expect(await generateMockups(ID, "initial", s.deps)).toBe("skipped");
  });

  it("Telegram алдаа нь загварыг унагахгүй", async () => {
    const s = setup({ notify: async () => { throw new Error("tg"); } });
    expect(await generateMockups(ID, "initial", s.deps)).toBe("done");
    expect(s.row.status).toBe("awaiting_approval");
    expect(s.alerts).toEqual(["Custom загвар Telegram"]);
  });
});

describe("sendMockupEmail", () => {
  const ready = { status: "awaiting_approval" as const, design_set: 1, mockup_dir: "dir-1" };

  it("нэг л удаа илгээнэ, idempotency key багцтай", async () => {
    const s = setup({}, ready);
    expect(await sendMockupEmail(ID, s.deps)).toBe("sent");
    expect(await sendMockupEmail(ID, s.deps)).toBe("already_sent");
    expect(s.emails).toHaveLength(1);
    expect(s.emails[0]).toMatchObject({ to: "bat@x.mn", idempotencyKey: `custom-mockups-${ID}-1` });
  });

  it("загвар бэлэн биш бол илгээхгүй", async () => {
    const s = setup({}, { status: "generating" });
    expect(await sendMockupEmail(ID, s.deps)).toBe("not_ready");
    expect(s.emails).toHaveLength(0);
  });

  it("Resend алдаа → буцааж 'awaiting_approval', дахин дарж болно", async () => {
    const s = setup({ sendEmail: async () => { throw new Error("Resend 500"); } }, ready);
    expect(await sendMockupEmail(ID, s.deps)).toBe("send_failed");
    expect(s.row.status).toBe("awaiting_approval");
    expect(s.alerts).toEqual(["Custom имэйл"]);
  });
});

describe("mockupEmail", () => {
  const one = (["A", "B", "C"] as const).map((key) => ({
    key,
    label: `L${key}`,
    images: [{ platform: "Facebook", url: `https://cdn/${mockupPath("d", key, "fb", "preview")}` }],
  }));
  const mail = mockupEmail(baseReq, one, "https://taplymn.com/");

  it("FB+IG: загвар бүрт хоёр зураг зэрэгцээ, сонгох товч загвар бүрт нэг", () => {
    const both = (["A", "B", "C"] as const).map((key) => ({
      key,
      label: `L${key}`,
      images: (["fb", "ig"] as const).map((p) => ({ platform: p === "fb" ? "Facebook" : "Instagram", url: `https://cdn/${mockupPath("d", key, p, "preview")}` })),
    }));
    const m = mockupEmail(baseReq, both, "https://taplymn.com");
    expect(m.html).toContain("https://cdn/d/A-fb.png");
    expect(m.html).toContain("https://cdn/d/A-ig.png");
    expect(m.html.match(/<img /g)).toHaveLength(6);
    expect(m.html.match(/>Энийг сонгох<\/a>/g)).toHaveLength(3);
    expect(m.html).toContain("Facebook, Instagram гэсэн хоёр хувилбартай");
    expect(mail.html).not.toContain("хоёр хувилбартай");
  });

  it("гарчиг, сонгох холбоос, утас", () => {
    expect(mail.subject).toBe("TAPLY — Номин <Бутик>-ийн 3 загвар бэлэн боллоо");
    for (const k of ["A", "B", "C"]) expect(mail.html).toContain(`https://taplymn.com/c/${"t".repeat(32)}?d=${k}`);
    expect(mail.html.match(/>Энийг сонгох<\/a>/g)).toHaveLength(3);
    expect(mail.html).toContain("9973 2298 · 8018 8488");
    expect(mail.text).toContain("Өөрчлөлт хэрэгтэй бол залгана уу: 9973 2298 · 8018 8488");
  });

  it("бизнесийн нэрийг HTML-д escape хийнэ", () => {
    expect(mail.html).toContain("Номин &lt;Бутик&gt;");
    expect(mail.html).not.toContain("<Бутик>");
  });
});
