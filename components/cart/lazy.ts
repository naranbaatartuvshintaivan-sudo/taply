// Хүнд хэсгүүд (framer-motion, form) — эхний JS-д орохгүй. Hover/touch/focus үед урьдчилан
// дуудаж, нээх мөчид chunk бэлэн байна. import() нэг л удаа татагдана (module cache).
export const loadDrawer = () => import("./CartDrawer");
export const loadModal = () => import("./ProductModal");
