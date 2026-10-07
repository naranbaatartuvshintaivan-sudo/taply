import Image from "next/image";

type Props = {
  n: number;
  label: string;
  src?: string; // public/photos/01.jpg гэх мэт — ирэхээр нөхнө
  alt?: string;
  height?: number;
  aspect?: string; // жишээ нь "3 / 4" — height-ийн оронд, өргөнөөс хамаарч өөрчлөгдөнө
  sizes?: string; // зураг дэлгэц дээр хэр өргөн гарахыг хэлнэ — зөв хэмжээтэй файл татахад хэрэгтэй
  dark?: boolean;
};

// Зураг ирээгүй үед саарал placeholder, ирсэн үед next/image
export function Photo({
  n,
  label,
  src,
  alt = "",
  height,
  aspect,
  sizes = "(min-width:1024px) 50vw, 100vw",
  dark,
}: Props) {
  return (
    <div
      className={
        "relative flex w-full items-center justify-center overflow-hidden rounded-[6px] " +
        (src ? "" : "border border-dashed ") +
        (dark ? "border-[#4a4a4a] bg-ink-soft" : "border-[#b5b5b5] bg-ph")
      }
      style={aspect ? { aspectRatio: aspect } : { height }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} quality={90} className="object-cover" />
      ) : (
        <span
          className={
            "p-6 text-center text-xs uppercase tracking-[.2em] " +
            (dark ? "text-[#9a9a9a]" : "text-mute")
          }
        >
          Зураг {String(n).padStart(2, "0")} · {label}
        </span>
      )}
    </div>
  );
}
