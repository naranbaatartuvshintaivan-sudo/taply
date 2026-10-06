import { CONTACT } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-[240px] bg-ink text-white">
      <div className="mx-auto max-w-[1360px] px-6 pb-16 pt-[120px] md:px-12">
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-[72px]">
          <div className="max-w-[420px] flex-[1_1_300px]">
            <div className="text-[28px] font-extrabold tracking-[.18em]">TAPLY</div>
            <p className="mt-7 text-[15px] leading-[1.7] text-[#b5b5b5]">
              NFC карт. Tap хийхэд л таны Instagram, Facebook нээгдэнэ. Улаанбаатар.
            </p>
          </div>

          <div className="flex-[1_1_260px]">
            <div className="mb-7 text-[13px] font-medium uppercase tracking-[.22em] text-[#9a9a9a]">
              Холбоо барих
            </div>
            <div className="flex flex-col gap-3.5 text-[17px] font-medium">
              {CONTACT.phones.map((p) => (
                <a key={p.href} href={p.href} className="hover:opacity-55">
                  {p.label}
                </a>
              ))}
              <a href={`mailto:${CONTACT.email}`} className="hover:opacity-55">
                {CONTACT.email}
              </a>
            </div>
          </div>

          <div className="flex-[1_1_260px]">
            <div className="mb-7 text-[13px] font-medium uppercase tracking-[.22em] text-[#9a9a9a]">
              Манайхыг дага
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={CONTACT.instagram}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-8 text-[15px] font-bold text-ink hover:bg-[#e6e6e6]"
              >
                Instagram
              </a>
              <a
                href={CONTACT.facebook}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border-[1.5px] border-white px-8 text-[15px] font-bold text-white hover:bg-white hover:text-ink"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="mt-[120px] flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-[#2a2a2a] pt-7 text-[13px] text-[#9a9a9a]">
          <span>Office болон агуулах байхгүй.</span>
          <span>taply.mn · Улаанбаатар</span>
        </div>
      </div>
    </footer>
  );
}
