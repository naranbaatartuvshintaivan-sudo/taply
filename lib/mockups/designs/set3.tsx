import { textOn } from "../color";
import {
  Abs, brandInk, brandOr, Caption, CREAM, CtaRow, Face, fitSize, hex, INK, Logo, LogoChip, logoTile, MUTE, Name,
  QrPlate, Rect, RULE, WHITE, type Design, type DesignKey,
} from "./common";

// Багц 3 (design_set 3, 6, 9, …) — багц 1, 2-оос бүтцээрээ өөр

export const SET_3: Record<DesignKey, Design> = {
  // A — Тойрог: цөцгий дэвсгэр, лого том цагаан дугуй (өргөн бол зууван) медаль дотор, налуу serif нэр
  A: {
    label: "Тойрог",
    render: (f) => {
      const ink = brandInk(f);
      return (
        <Face bg={CREAM}>
          <Abs top={56} height={400}>
            <LogoChip f={f} size={360} ring={{ color: ink, width: 6 }} />
          </Abs>
          <Abs top={474} height={180}>
            <Name text={f.name} font="Lora" weight={500} italic size={fitSize(f.name, { max: 84, min: 38, width: 1000, em: 0.56, height: 180 })} color={INK} width={1000} />
          </Abs>
          <CtaRow f={f} font="Lora" weight={500} color={INK} iconColor={ink} iconOn={CREAM} />
          <QrPlate f={f} bg={WHITE} radius={20} />
          <Caption font="Lora" color={ink} italic />
        </Face>
      );
    },
  },

  // B — Хуваасан: дээд хэсэг брэндийн өнгө — лого зүүн, нэр баруун (нэг мөрөнд зэрэгцээ), доод хэсэг цагаан
  B: {
    label: "Хуваасан",
    render: (f) => {
      const band = brandOr(f, INK);
      const fg = textOn(band);
      const tile = logoTile(f, band, WHITE);
      return (
        <Face bg={WHITE}>
          <Rect top={0} left={0} width={1200} height={640} color={band} />
          <Abs top={0} left={70} width={1060} height={640} dir="row" gap={44}>
            <Abs top={0} height={640} width={380} style={{ position: "relative" }}>
              <Logo f={f} maxW={380} maxH={440} area={380 * 440 * 0.5} tile={tile} pad={tile ? 26 : 0} />
            </Abs>
            <Name
              text={f.name}
              font="Inter"
              weight={800}
              size={fitSize(f.name, { max: 96, min: 34, width: 630, em: 0.7, height: 420 })}
              color={fg}
              width={630}
              align="left"
            />
          </Abs>
          <CtaRow f={f} font="Inter" weight={800} size={48} color={INK} iconColor={brandInk(f)} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: RULE, width: 2 }} radius={14} />
          <Caption font="Inter" color={MUTE} />
        </Face>
      );
    },
  },

  // C — Ташуу зурвас: дээд хэсгийг огтолсон налуу брэндийн зурвас, лого түүн дээр цагаан хавтанд, нэр доор
  C: {
    label: "Ташуу зурвас",
    render: (f) => {
      const band = brandOr(f, INK);
      const ink = brandInk(f);
      return (
        <Face bg={WHITE}>
          <div style={{ position: "absolute", top: 150, left: -300, width: 1800, height: 300, background: hex(band), transform: "rotate(-9deg)", display: "flex" }} />
          <Abs top={90} height={420}>
            <Logo f={f} maxW={600} maxH={340} area={600 * 340 * 0.5} tile={WHITE} pad={34} radius={28} />
          </Abs>
          <Abs top={516} height={140}>
            <Name text={f.name} font="Manrope" weight={800} size={fitSize(f.name, { max: 80, min: 36, width: 1040, em: 0.66, height: 140 })} color={INK} width={1040} />
          </Abs>
          <CtaRow f={f} font="Manrope" weight={700} color={INK} iconColor={ink} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: ink, width: 6 }} radius={26} />
          <Caption font="Manrope" color={MUTE} />
        </Face>
      );
    },
  },
};
