import { CONTACT } from "./config";
import type { CustomRequest } from "./custom-db";
import { escapeHtml } from "./telegram";

// Харилцагч руу явах "3 загвар бэлэн боллоо" имэйл. Цэвэр функц — unit test-тэй.
// Загвар бүр: FB/IG хувилбар зэрэгцээ (нэг л платформ бол нэг зураг) + "Энийг сонгох"
// → <site>/c/<token>?d=A (Шат 3-ын төлбөрийн хуудас).

export type MockupEmailDesign = {
  key: "A" | "B" | "C";
  label: string;
  images: { platform: string; url: string }[];
};

export function mockupEmail(
  req: Pick<CustomRequest, "business_name" | "contact_name" | "token">,
  designs: MockupEmailDesign[],
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const site = siteUrl.replace(/\/+$/, "");
  const choose = (k: string) => `${site}/c/${encodeURIComponent(req.token)}?d=${k}`;
  const phones = CONTACT.phones.map((p) => p.label).join(" · ");
  const subject = `TAPLY — ${req.business_name}-ийн 3 загвар бэлэн боллоо`;

  const imageRow = (d: MockupEmailDesign) => {
    const pair = d.images.length > 1;
    const cells = d.images
      .map(
        (img, i) => `<td style="width:${pair ? "50%" : "100%"};vertical-align:top;padding:0 ${pair && i === 0 ? "6px" : "0"} 0 ${pair && i === 1 ? "6px" : "0"}">
<a href="${e(choose(d.key))}"><img src="${e(img.url)}" width="${pair ? 250 : 512}" alt="Загвар ${d.key} · ${e(img.platform)}" style="display:block;width:100%;height:auto;border:0;border-radius:6px;background:#e2e2e2"></a>
${pair ? `<div style="font-size:13px;color:#6b6b6b;margin-top:6px">${e(img.platform)}</div>` : ""}
</td>`,
      )
      .join("");
    return `<table role="presentation" style="width:100%;border-collapse:collapse"><tr>${cells}</tr></table>`;
  };

  const blocks = designs
    .map(
      (d) => `<tr><td style="padding:0 0 44px">
<div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#6b6b6b;margin:0 0 12px">Загвар ${d.key} · ${e(d.label)}</div>
${imageRow(d)}
<a href="${e(choose(d.key))}" style="display:inline-block;margin-top:16px;padding:15px 34px;border-radius:999px;background:#0a0a0a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Энийг сонгох</a>
</td></tr>`,
    )
    .join("");

  const both = designs.some((d) => d.images.length > 1);
  const html = `<!doctype html><html lang="mn"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<div style="font-size:20px;font-weight:800;letter-spacing:.18em">TAPLY</div>
<h1 style="font-size:28px;line-height:1.15;letter-spacing:-.02em;margin:40px 0 16px">${e(req.business_name)}-ийн 3 загвар бэлэн боллоо</h1>
<p style="font-size:16px;line-height:1.6;color:#2a2a2a;margin:0 0 36px">Сайн байна уу, ${e(req.contact_name)}. Таалагдсан загвар доорх “Энийг сонгох” товчийг дарна уу.${both ? " Загвар бүр Facebook, Instagram гэсэн хоёр хувилбартай." : ""} Дараагийн алхамд тоо ширхэг, үнээ шалгаад төлнө.</p>
<table role="presentation" style="width:100%;border-collapse:collapse">${blocks}</table>
<p style="font-size:15px;line-height:1.7;color:#2a2a2a;margin:8px 0 0;padding-top:24px;border-top:1px solid #e5e5e5">Өөрчлөлт хэрэгтэй бол залгана уу: <b>${e(phones)}</b></p>
</div></body></html>`;

  const text = [
    `${req.business_name}-ийн 3 загвар бэлэн боллоо`,
    "",
    `Сайн байна уу, ${req.contact_name}. Таалагдсан загвараа сонгоно уу:`,
    "",
    ...designs.map((d) => `Загвар ${d.key} (${d.label}): ${choose(d.key)}`),
    "",
    `Өөрчлөлт хэрэгтэй бол залгана уу: ${phones}`,
  ].join("\n");

  return { subject, html, text };
}
