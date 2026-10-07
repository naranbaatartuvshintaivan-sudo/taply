// Сайтын тохиргоо — үнийн хэсгийг нуух бол SHOW_PRICES = false
export const SHOW_PRICES = true;

// Шилжилтийн давалгаа аль талаас эхлэх вэ: "left" (зүүн дээд) | "right" (баруун дээд)
export const TRANSITION_ORIGIN: "left" | "right" = "left";

export const CONTACT = {
  instagram: "https://www.instagram.com/taply_mn/",
  facebook: "https://www.facebook.com/profile.php?id=61594360375703",
  phones: [
    { label: "9973 2298", href: "tel:+97699732298" },
    { label: "8018 8488", href: "tel:+97680188488" },
  ],
  email: "officaltyply@gmail.com",
};

export type PriceRow = { label: string; value: string };
export type PriceCard = {
  name: string;
  main: string;
  sub: string;
  rows: PriceRow[];
  dark?: boolean;
};

export const PRICE_CARDS: PriceCard[] = [
  {
    name: "Энгийн",
    main: "34,900₮",
    sub: "Facebook эсвэл Instagram — нэг карт",
    rows: [
      { label: "1 ширхэг", value: "34,900₮" },
      { label: "2 ширхэг (FB + IG)", value: "55,900₮" },
      { label: "3–9 ширхэг", value: "27,900₮ / ш" },
      { label: "10+ ширхэг", value: "24,900₮ / ш" },
    ],
  },
  {
    name: "Өөрийн логотой",
    main: "44,900₮",
    sub: "Лого, QR, монгол бичвэр — нэг карт",
    dark: true,
    rows: [
      { label: "1 ширхэг", value: "44,900₮" },
      { label: "2 ширхэг", value: "69,900₮" },
      { label: "3–9 ширхэг", value: "32,900₮ / ш" },
      { label: "10+ ширхэг", value: "29,900₮ / ш" },
    ],
  },
];
