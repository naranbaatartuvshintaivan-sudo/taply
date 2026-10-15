import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // server-only нь Next-ийн гадна алдаа шиддэг — тестэд хоосон модуль
      "server-only": fileURLToPath(new URL("./test/empty.ts", import.meta.url)),
    },
  },
  // tsconfig-ийн jsx: "preserve" нь Next-д зориулагдсан — тестэд JSX-ийг React runtime-аар хөрвүүлнэ
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
});
