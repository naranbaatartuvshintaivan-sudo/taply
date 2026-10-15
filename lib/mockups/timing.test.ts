import sharp from "sharp";
import { it } from "vitest";
import { prepareLogo } from "./logo";
import { renderDesigns } from "./render";

it.runIf(process.env.MOCKUP_TIMING)("timing: FB+IG, 6 хувилбар", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="150" cy="200" r="110" fill="#7b2cbf"/></svg>`;
  const logo = await prepareLogo(await sharp(Buffer.from(svg)).png().toBuffer());
  const t = Date.now();
  await renderDesigns({ name: "🧪 ТЕСТ Лого", logo, fbUrl: "https://www.facebook.com/taply.test", igUrl: "https://www.instagram.com/taply.test/", set: 1 });
  console.log("render ms", Date.now() - t);
}, 120_000);
