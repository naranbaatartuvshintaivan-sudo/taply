import type { Design, DesignKey } from "./common";
import { SET_1 } from "./set1";
import { SET_2 } from "./set2";
import { SET_3 } from "./set3";

// Багц бүр 3 өөр БҮТЭЦ (зөвхөн өнгө биш). "Дахин үүсгэх" бүрт дараагийн багц.
export {
  CAPTION, CAPTION_SIZE, cleanName, DESIGN_KEYS, FACE_H, FACE_W, fitLogo, fitSize, HEAD_SIZE, HEADLINE, ICON, MM,
  PLATE, PLATE_TOP, QR_MAX, wrapLines,
} from "./common";
export type { Design, DesignKey, FaceInput } from "./common";

export const DESIGN_SETS: Record<DesignKey, Design>[] = [SET_1, SET_2, SET_3];

/** design_set (1, 2, 3, …) → багц: (n - 1) % 3. Дуусвал эхнээсээ эргэлдэнэ. */
export const designSet = (n: number) => DESIGN_SETS[(Math.max(1, n) - 1) % DESIGN_SETS.length];
