import Image from "next/image";

type Props = {
  n: number;
  label: string;
  src?: string; // public/photos/01.jpg гэх мэт — ирэхээр нөхнө
  alt?: string;
  height: number;
  dark?: boolean;
};

// Зураг ирээгүй үед саарал placeholder, ирсэн үед next/image
export function Photo({ n, label, src, alt = "", height, dark }: Props) {
  return (
    <div
      className={
        "relative flex w-full items-center justify-center overflow-hidden border border-dashed " +
        (dark ? "border-[#4a4a4a] bg-ink-soft" : "border-[#b5b5b5] bg-ph")
      }
      style={{ height }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
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
