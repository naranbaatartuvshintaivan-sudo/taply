// Log / Telegram ⚠️ мэдэгдэлд нууц утга хэзээ ч гарахгүй байх сүүлийн хамгаалалт.
// Цэвэр функц — unit test-тэй.

const SECRET_ENV = [
  "ADMIN_KEY",
  "CRON_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WIRE_SECRET_KEY",
  "WIRE_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "RESEND_API_KEY",
] as const;

export function redactSecrets(s: string, e: Record<string, string | undefined> = process.env): string {
  let out = s;
  // Орчны нууц утга яг өөрөөрөө орсон бол (8-аас богино утгыг алгасна — санамсаргүй таарахгүйн тулд)
  for (const name of SECRET_ENV) {
    const v = e[name];
    if (v && v.length >= 8) out = out.split(v).join(`<${name}>`);
  }
  return out
    .replace(/([?&](?:key|token|secret)=)[^&\s"'<>]+/gi, "$1***") // URL-ийн ?key=…
    .replace(/bot\d+:[\w-]+/g, "bot***")
    .replace(/(sk|whsec|re)_[A-Za-z0-9_]+/g, "$1_***");
}
