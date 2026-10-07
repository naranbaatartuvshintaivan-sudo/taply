// Бүтээгдэхүүний мэдээлэл — нүүр хуудасны торонд болон /products/[slug] хуудсанд ашиглагдана.
// Шинэ бүтээгдэхүүн нэмэх, текст засах бол зөвхөн энэ файлыг өөрчилнө.
export type Product = {
  slug: string;
  name: string;
  src: string; // public/photos/...
  alt: string;
  summary: string; // нүүр хуудасны карт болон хайлтын тайлбар
  about: string; // дэлгэрэнгүй хуудсан дээрх тайлбар
  features: string[];
};

const CUSTOM_FEATURES = [
  "Өөрийн лого, QR код, монгол бичвэр",
  "Custom загвар үнэгүй",
  "Батлагдсанаас хойш 3–5 хоногт бэлэн",
];

export const PRODUCTS: Product[] = [
  {
    slug: "instagram-stand",
    name: "Instagram стенд",
    src: "/photos/stand-instagram.jpg",
    alt: "Instagram NFC болон QR кодтой ширээний стенд",
    summary: "Ширээн дээр тавьдаг стенд. Утсаа хүргэхэд Instagram хуудас нээгдэнэ.",
    about:
      "L хэлбэртэй, ширээн дээр босоо зогсдог стенд. Дээр нь “Tap your phone to follow us” гэж бичсэн. Утсаа хүргэхэд эсвэл QR кодыг уншуулахад таны Instagram хуудас шууд нээгдэнэ.",
    features: [
      "NFC: утсаа хүргэхэд л нээгдэнэ",
      "QR код: камераараа уншуулж болно",
      "Касс, лангуу, ширээ, салоны толины дэргэд тавихад тохиромжтой",
    ],
  },
  {
    slug: "facebook-stand",
    name: "Facebook стенд",
    src: "/photos/stand-facebook.jpg",
    alt: "Facebook NFC болон QR кодтой ширээний стенд",
    summary: "Ширээн дээр тавьдаг стенд. Утсаа хүргэхэд Facebook хуудас нээгдэнэ.",
    about:
      "L хэлбэртэй, ширээн дээр босоо зогсдог стенд. Дээр нь “Tap your phone to follow us” гэж бичсэн. Утсаа хүргэхэд эсвэл QR кодыг уншуулахад таны Facebook хуудас шууд нээгдэнэ.",
    features: [
      "NFC: утсаа хүргэхэд л нээгдэнэ",
      "QR код: камераараа уншуулж болно",
      "Касс, лангуу, ширээ, салоны толины дэргэд тавихад тохиромжтой",
    ],
  },
  {
    slug: "blank-stand",
    name: "Хоосон стенд",
    src: "/photos/stand-blank.jpg",
    alt: "Цагаан хоосон ширээний стенд",
    summary: "Цагаан, хэвлэлгүй стенд. Өөрийн лого, QR, бичвэрээр хийлгэнэ.",
    about:
      "Цагаан, хэвлэлгүй L хэлбэртэй стенд. Өөрийн лого, QR код, монгол бичвэрээр хийлгэх тусгай (custom) захиалгыг утсаар тохирно.",
    features: CUSTOM_FEATURES,
  },
  {
    slug: "instagram-sticker",
    name: "Instagram наалт",
    src: "/photos/sticker-instagram.jpg",
    alt: "Instagram NFC наалт",
    summary: "Жижиг NFC наалт. Утсаа хүргэхэд л Instagram хуудас нээгдэнэ.",
    about:
      "Дээр нь “Follow us on Instagram” гэж бичсэн жижиг NFC наалт. Утсаа хүргэхэд таны Instagram хуудас шууд нээгдэнэ. Апп татах, QR уншуулах шаардлагагүй.",
    features: [
      "NFC: утсаа хүргэхэд л нээгдэнэ",
      "Апп татах шаардлагагүй",
      "Таны линкийг наалт руу бичиж өгнө",
    ],
  },
  {
    slug: "facebook-sticker",
    name: "Facebook наалт",
    src: "/photos/sticker-facebook.jpg",
    alt: "Facebook NFC наалт",
    summary: "Жижиг NFC наалт. Утсаа хүргэхэд л Facebook хуудас нээгдэнэ.",
    about:
      "Дээр нь “Follow us on Facebook” гэж бичсэн жижиг NFC наалт. Утсаа хүргэхэд таны Facebook хуудас шууд нээгдэнэ. Апп татах, QR уншуулах шаардлагагүй.",
    features: [
      "NFC: утсаа хүргэхэд л нээгдэнэ",
      "Апп татах шаардлагагүй",
      "Таны линкийг наалт руу бичиж өгнө",
    ],
  },
  {
    slug: "blank-stand-tall",
    name: "Хоосон стенд (босоо)",
    src: "/photos/stand-blank-tall.jpg",
    alt: "Цагаан хоосон босоо ширээний стенд",
    summary: "Цагаан, хэвлэлгүй босоо стенд. Өөрийн лого, QR, бичвэрээр хийлгэнэ.",
    about:
      "Цагаан, хэвлэлгүй босоо хэлбэртэй стенд. Өөрийн лого, QR код, монгол бичвэрээр хийлгэх тусгай (custom) захиалгыг утсаар тохирно.",
    features: CUSTOM_FEATURES,
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
