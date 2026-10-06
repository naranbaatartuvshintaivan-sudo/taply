import { GoLink } from "./PageTransition";

const links = [
  { id: "how", label: "Яаж ажилладаг" },
  { id: "city", label: "Хотод" },
  { id: "price", label: "Үнэ" },
  { id: "order", label: "Захиалах" },
];

export function Nav({ showPrices }: { showPrices: boolean }) {
  return (
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-[#ececec] bg-white/90 backdrop-blur-md">
      <header className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-5 md:px-12">
        <GoLink id="top" className="text-[22px] font-extrabold tracking-[.18em] hover:opacity-55">
          TAPLY
        </GoLink>
        <nav className="flex flex-wrap gap-x-9 gap-y-2 text-sm font-medium">
          {links
            .filter((l) => showPrices || l.id !== "price")
            .map((l) => (
              <GoLink key={l.id} id={l.id} className="hover:opacity-55">
                {l.label}
              </GoLink>
            ))}
        </nav>
      </header>
    </div>
  );
}
