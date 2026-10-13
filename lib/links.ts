// FB / IG линкийг шалгаж, нэг хэлбэрт оруулна. Цэвэр функц — unit test-тэй.

const FB_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mbasic.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.me",
]);

const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const IG_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const IG_RESERVED = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv"]);

function parseUrl(input: string): URL | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

/** facebook.com/... линк → "https://www.facebook.com/..." эсвэл null */
export function normalizeFacebook(input: string): string | null {
  const u = parseUrl(input);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (!FB_HOSTS.has(host)) return null;
  const path = u.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return null;
  if (host === "fb.me") return `https://fb.me${path}`;
  // profile.php?id=... — id-г л үлдээнэ, бусад tracking параметрийг хаяна
  if (path === "/profile.php") {
    const id = u.searchParams.get("id");
    return id && /^\d+$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : null;
  }
  return `https://www.facebook.com${path}`;
}

/** "@handle", "handle", "instagram.com/handle" → "https://www.instagram.com/handle/" эсвэл null */
export function normalizeInstagram(input: string): string | null {
  const s = input.trim();
  let handle: string | null = null;
  if (/^@?[A-Za-z0-9._]+$/.test(s)) {
    handle = s.replace(/^@/, "");
  } else {
    const u = parseUrl(s);
    if (!u || !IG_HOSTS.has(u.hostname.toLowerCase())) return null;
    const first = u.pathname.split("/").filter(Boolean)[0];
    handle = first ?? null;
  }
  if (!handle || !IG_HANDLE.test(handle) || IG_RESERVED.has(handle.toLowerCase())) return null;
  return `https://www.instagram.com/${handle}/`;
}

/** Харуулахад: "https://www.instagram.com/x/" → "@x", fb → "facebook.com/..." */
export function displayLink(url: string): string {
  const ig = url.match(/^https:\/\/www\.instagram\.com\/([^/]+)\/$/);
  if (ig) return `@${ig[1]}`;
  return url.replace(/^https:\/\/(www\.)?/, "");
}
