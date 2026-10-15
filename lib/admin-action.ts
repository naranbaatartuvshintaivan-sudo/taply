import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminCookie } from "./admin";
import { alert } from "./alert";
import { isUuid } from "./db";

// Admin хуудасны form POST-ууд: cookie шалгах → үйлдэл → 303-аар admin хуудас руу ?m=<код>.
// Эрхгүй бол 404. Мессеж нь зөвхөн тогтсон код (хэрэглэгчийн текст, түлхүүр URL-д орохгүй).

export const ADMIN_MESSAGES = {
  sent: "Имэйл илгээгдлээ ✓",
  already_sent: "Имэйл аль хэдийн илгээгдсэн байна",
  not_ready: "Загвар бэлэн биш байна",
  send_failed: "Имэйл илгээж чадсангүй. Дахин оролдоно уу.",
  regen: "Шинэ загвар үүсгэж байна…",
  regen_busy: "Одоо үүсгэж байна эсвэл аль хэдийн сонгогдсон",
  error: "Алдаа гарлаа. Telegram-ийн ⚠️ мэдэгдлийг харна уу.",
} as const;

export type AdminMessage = keyof typeof ADMIN_MESSAGES;

export async function adminAction(req: Request, id: string, run: () => Promise<AdminMessage>): Promise<NextResponse> {
  if (!isUuid(id) || !isAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return new NextResponse("Not found", { status: 404 });
  }
  let m: AdminMessage;
  try {
    m = await run();
  } catch (e) {
    await alert("Admin custom", id, e);
    m = "error";
  }
  const back = new URL(`/admin/custom/${id}`, req.url);
  back.searchParams.set("m", m);
  return NextResponse.redirect(back, 303);
}
