import { readFileSync } from "node:fs";
import path from "node:path";

// Кирилл (Ө, Ү орно) дэмждэг TTF-ууд — assets/fonts/ (SIL Open Font License).
// next.config.ts-ийн outputFileTracingIncludes нь эдгээрийг Vercel функцэд багтаана.

type Weight = 400 | 500 | 600 | 700 | 800;
export type FontSpec = { name: string; data: Buffer; weight: Weight; style: "normal" | "italic" };

const FILES: [name: string, file: string, weight: Weight, style: "normal" | "italic"][] = [
  ["Manrope", "Manrope-Medium.ttf", 500, "normal"],
  ["Manrope", "Manrope-Bold.ttf", 700, "normal"],
  ["Manrope", "Manrope-ExtraBold.ttf", 800, "normal"],
  ["Playfair", "PlayfairDisplay-Regular.ttf", 400, "normal"],
  ["Playfair", "PlayfairDisplay-Bold.ttf", 700, "normal"],
  ["Lora", "Lora-Medium.ttf", 500, "normal"],
  ["Lora", "Lora-Bold.ttf", 700, "normal"],
  ["Lora", "Lora-MediumItalic.ttf", 500, "italic"],
  ["Inter", "Inter-Medium.ttf", 500, "normal"],
  ["Inter", "Inter-ExtraBold.ttf", 800, "normal"],
];

let cached: FontSpec[] | null = null;

export function fonts(): FontSpec[] {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "assets", "fonts");
  cached = FILES.map(([name, file, weight, style]) => ({ name, data: readFileSync(path.join(dir, file)), weight, style }));
  return cached;
}
