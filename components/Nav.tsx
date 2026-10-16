import Image from "next/image";
import type { ReactNode } from "react";
import { CartButton } from "./cart/CartButton";
import { GoLink } from "./PageTransition";

const links = [
  { id: "how", label: "Яаж ажилладаг" },
  { id: "products", label: "Бүтээгдэхүүн" },
];

// Нүүр хуудсан дээр гөлгөр шилжилттэй GoLink, бусад хуудсан дээр нүүр хуудасны хэсэг рүү энгийн холбоос
function NavLink({
  id,
  home,
  className,
  children,
}: {
  id: string;
  home: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (home) {
    return (
      <GoLink id={id} className={className}>
        {children}
      </GoLink>
    );
  }
  return (
    <a href={id === "top" ? "/" : `/#${id}`} className={className}>
      {children}
    </a>
  );
}

// Сагсны товч зөвхөн CartProvider-тай (нүүр) хуудсанд гарна
export function Nav({ home = true }: { home?: boolean }) {
  return (
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-[#ececec] bg-white/90 backdrop-blur-md">
      <header className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-[14px] md:px-12">
        <NavLink
          id="top"
          home={home}
          className="flex min-h-11 items-center gap-3 text-[22px] font-extrabold tracking-[.18em] hover:opacity-55"
        >
          <Image src="/logo.png" alt="" width={31} height={32} priority className="h-8 w-auto" />
          TAPLY
        </NavLink>
        {/* Утсан дээр: 1-р мөр лого + сагс, 2-р мөр цэс */}
        <nav className="order-3 flex basis-full flex-wrap gap-x-9 text-sm font-medium sm:order-2 sm:ml-auto sm:basis-auto">
          {links.map((l) => (
            <NavLink key={l.id} id={l.id} home={home} className="inline-flex min-h-11 items-center hover:opacity-55">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="order-2 flex sm:order-3">
          <CartButton />
        </div>
      </header>
    </div>
  );
}
