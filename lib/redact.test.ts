import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  const env = { ADMIN_KEY: "A".repeat(40), CRON_SECRET: "c".repeat(40) };
  it("ADMIN_KEY болон бусад нууц утгыг хаана ч байсан нууна", () => {
    const s = `fail https://x.app/admin/custom/1?key=${env.ADMIN_KEY} and ${env.CRON_SECRET}`;
    const r = redactSecrets(s, env);
    expect(r).not.toContain(env.ADMIN_KEY);
    expect(r).not.toContain(env.CRON_SECRET);
  });
  it("?key= / &token= параметрийг утгаас үл хамааран нууна", () => {
    expect(redactSecrets("/admin/login?key=whatever123&next=/a", {})).toBe("/admin/login?key=***&next=/a");
    expect(redactSecrets("x?a=1&token=abc", {})).toBe("x?a=1&token=***");
  });
  it("bot token, sk_/whsec_/re_ түлхүүр", () => {
    expect(redactSecrets("https://api.telegram.org/bot123:AbC-d/sendMessage", {})).toBe("https://api.telegram.org/bot***/sendMessage");
    expect(redactSecrets("sk_live_abc whsec_x re_y", {})).toBe("sk_*** whsec_*** re_***");
  });
});
