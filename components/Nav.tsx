import Image from "next/image";
import type { ReactNode } from "react";
import { GoLink } from "./PageTransition";

const links = [
  { id: "how", label: "Яаж ажилладаг" },
  { id: "city", label: "Хотод" },
  { id: "products", label: "Бүтээгдэхүүн" },
  { id: "price", label: "Үнэ" },
  { id: "order", label: "Захиалах" },
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

export function Nav({ showPrices, home = true }: { showPrices: boolean; home?: boolean }) {
  return (
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-[#ececec] bg-white/90 backdrop-blur-md">
      <header className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-5 md:px-12">
        <NavLink
          id="top"
          home={home}
          className="flex items-center gap-3 text-[22px] font-extrabold tracking-[.18em] hover:opacity-55"
        >
          <Image src="/logo.png" alt="" width={31} height={32} priority className="h-8 w-auto" />
          TAPLY
        </NavLink>
        <nav className="flex flex-wrap gap-x-9 gap-y-2 text-sm font-medium">
          {links
            .filter((l) => showPrices || l.id !== "price")
            .map((l) => (
              <NavLink key={l.id} id={l.id} home={home} className="hover:opacity-55">
                {l.label}
              </NavLink>
            ))}
        </nav>
      </header>
    </div>
  );
}
