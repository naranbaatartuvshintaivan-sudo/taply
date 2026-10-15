// Facebook / Instagram-ийн энгийн дүрс (SVG data URI). Зөвхөн өгсөн платформынхыг харуулна.

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Дугуй дотор "f" */
export function facebookIcon(color: string, on: string): string {
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<circle cx="50" cy="50" r="50" fill="${color}"/>` +
      `<path fill="${on}" d="M55.6 86V54.8h10.5l1.6-12.2H55.6v-7.8c0-3.5 1-5.9 6-5.9h6.4V18.1c-1.1-.1-4.9-.5-9.3-.5-9.2 0-15.5 5.6-15.5 15.9v9h-10.4v12.2h10.4V86z"/>` +
      `</svg>`,
  );
}

/** Бөөрөнхий дөрвөлжин камер */
export function instagramIcon(color: string): string {
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="${color}" stroke-width="8">` +
      `<rect x="8" y="8" width="84" height="84" rx="24"/>` +
      `<circle cx="50" cy="50" r="19"/>` +
      `<circle cx="74" cy="26" r="3" fill="${color}" stroke="none"/>` +
      `</svg>`,
  );
}
