// Сервер эхлэх үед env-ийг шалгана — дутуу бол эхний хүсэлтээс өмнө ойлгомжтой алдаа гарна.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { env } = await import("./lib/env");
  env();
}
