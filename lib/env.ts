import "server-only";
import { z } from "zod";

// Серверийн нууц тохиргоо. Аль нэг нь дутуу бол ойлгомжтой алдаа өгнө
// (утгыг нь хэзээ ч хэвлэхгүй — зөвхөн нэрийг).
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("https://taplymn.com"),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  WIRE_SECRET_KEY: z
    .string()
    .regex(/^sk_(live|test)_\S+$/, "sk_live_ эсвэл sk_test_-ээр эхлэх ёстой"),
  // Webhook бүртгэхээс өмнө хоосон байж болно — тэр үед webhook 503 буцааж, Wire дахин илгээнэ
  WIRE_WEBHOOK_SECRET: z.string().regex(/^whsec_\S+$/, "whsec_-ээр эхлэх ёстой").optional(),

  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, "BotFather-ийн token хэлбэртэй байх ёстой"),
  TELEGRAM_CHAT_ID: z.string().regex(/^-?\d+$/, "тоо байх ёстой (group бол - тэмдэгтэй)"),

  // Имэйл — тохируулаагүй бол хэрэглэгчид имэйл илгээхгүй (Telegram-д ⚠️)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().default("TAPLY <order@taplymn.com>"),

  ADMIN_KEY: z.string().min(32, "дор хаяж 32 тэмдэгт"),
  CRON_SECRET: z.string().min(32, "дор хаяж 32 тэмдэгт"),
  MOCKUP_AUTO_SEND: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  MAKE_WEBHOOK_URL: z.url().optional(),
  // /custom формыг нийтэд нээх эсэх (lib/flags.ts) — эзэмшигчийн OK-оор true болгоно
  CUSTOM_PUBLIC: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  // Хоосон string-ийг "тохируулаагүй" гэж үзнэ (.env.example-ийг хуулахад ийм байдаг)
  const raw = Object.fromEntries(
    Object.keys(schema.shape).map((k) => [k, process.env[k] === "" ? undefined : process.env[k]]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Env тохиргоо буруу эсвэл дутуу (.env.local / Vercel env):\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}
