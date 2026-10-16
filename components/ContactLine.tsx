import { CONTACT } from "@/lib/config";

// Утас (дугаар бүр тусдаа tel:) + имэйл (mailto:) — бүх мессежинд нэг хэлбэрээр.
// Нарийн дэлгэц дээр элемент бүр бүтнээрээ дараагийн мөрөнд эвхэгдэнэ (дугаар, хаяг тасрахгүй);
// тусгаарлагч "·" өмнөх элементийн араас явдаг тул шинэ мөр түүгээр эхлэхгүй.
export function ContactLine({ className = "", linkClassName = "font-bold text-ink" }: { className?: string; linkClassName?: string }) {
  const items = [...CONTACT.phones, { label: CONTACT.email, href: `mailto:${CONTACT.email}` }];
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 ${className}`}>
      {items.map((p, i) => (
        <span key={p.href} className="inline-flex items-center gap-x-2 whitespace-nowrap">
          <a href={p.href} className={`inline-flex min-h-11 items-center underline-offset-4 hover:underline ${linkClassName}`}>
            {p.label}
          </a>
          {i < items.length - 1 && <span aria-hidden>·</span>}
        </span>
      ))}
    </span>
  );
}
