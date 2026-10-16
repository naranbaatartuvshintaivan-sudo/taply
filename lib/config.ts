// Сайтын тохиргоо — нүүр хуудасны "Үнэ ба хөнгөлөлт" блокийг нуух бол SHOW_PRICES = false
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

// Messenger шууд: CONTACT.facebook-ийн profile.php?id=<id> → https://m.me/<id> (шинэ id зохиохгүй)
export function messengerUrl(facebook: string): string {
  const id = new URL(facebook).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) throw new Error("CONTACT.facebook-д profile.php?id= байхгүй");
  return `https://m.me/${id}`;
}
export const MESSENGER_URL = messengerUrl(CONTACT.facebook);

// Хот доторх хүргэлт — бусад газар утсаар тохирно
export const DELIVERY = {
  fee: 7000,
  freeFromQty: 3, // нийт ширхэг ийм буюу түүнээс дээш бол үнэгүй
  districts: ["Баянзүрх", "Баянгол", "Сүхбаатар", "Чингэлтэй", "Хан-Уул", "Сонгинохайрхан"],
};

export const REFUND_DAYS = 7;
