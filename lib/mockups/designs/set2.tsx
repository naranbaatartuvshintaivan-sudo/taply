import { textOn } from "../color";
import {
  Abs, brandInk, brandOr, Caption, CtaRow, Face, FACE_H, fitSize, hex, INK, Logo, logoTile, mix, MUTE, Name,
  QrPlate, Rect, RULE, WHITE, type Design, type DesignKey,
} from "./common";

// Багц 2 (design_set 2, 5, 8, …) — багц 1-ээс бүтцээрээ өөр

const STRIPE = 112;

export const SET_2: Record<DesignKey, Design> = {
  // A — Том лого: дээд хагсыг дүүргэсэн том лого цайвар брэнд хавтан дээр, нэр жижиг, тархсан үсэгтэй
  A: {
    label: "Том лого",
    render: (f) => {
      const panel = f.brand ? mix(f.brand, WHITE, 0.9) : { r: 242, g: 242, b: 242 };
      const tile = logoTile(f, panel, WHITE);
      return (
        <Face bg={WHITE}>
          <Abs top={40} left={40} width={1120} height={540} style={{ background: hex(panel), borderRadius: 40 }}>
            <Logo f={f} maxW={980} maxH={460} area={980 * 460 * 0.5} tile={tile} pad={tile ? 30 : 0} />
          </Abs>
          <Abs top={592} height={86}>
            <Name
              text={f.name}
              font="Manrope"
              weight={700}
              size={fitSize(f.name, { max: 40, min: 26, width: 1060, em: 0.64, tracking: 0.08, height: 86 })}
              color={MUTE}
              width={1060}
              tracking={0.08}
            />
          </Abs>
          <CtaRow f={f} font="Manrope" weight={800} color={INK} iconColor={brandInk(f)} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: RULE, width: 2 }} radius={20} />
          <Caption font="Manrope" color={MUTE} />
        </Face>
      );
    },
  },

  // B — Тал зурвас: зүүн талд босоо брэндийн зурвас, нэр нь зурвас дээр босоо бичигдэнэ
  B: {
    label: "Тал зурвас",
    render: (f) => {
      const band = brandOr(f, INK);
      const fg = textOn(band);
      const long = FACE_H - 120;
      const size = fitSize(f.name, { max: 64, min: 30, width: long, em: 0.66, maxLines: 1 });
      return (
        <Face bg={WHITE}>
          <Rect top={0} left={0} width={STRIPE} height={FACE_H} color={band} />
          {/* Босоо нэр — доороос дээш */}
          <div
            style={{
              position: "absolute",
              top: FACE_H / 2 - STRIPE / 2,
              left: STRIPE / 2 - long / 2,
              width: long,
              height: STRIPE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-90deg)",
              fontFamily: "Inter",
              fontWeight: 800,
              fontSize: size,
              color: hex(fg),
              whiteSpace: "nowrap",
            }}
          >
            {f.name}
          </div>
          <Abs top={70} left={STRIPE + 60} width={1200 - STRIPE - 120} height={520}>
            <Logo f={f} maxW={860} maxH={480} area={860 * 480 * 0.45} tile={logoTile(f, WHITE, INK)} pad={logoTile(f, WHITE, INK) ? 30 : 0} />
          </Abs>
          <Rect top={636} left={STRIPE + 60} width={1200 - STRIPE - 120} height={2} color={RULE} />
          <CtaRow f={f} font="Inter" weight={800} size={48} color={INK} iconColor={brandInk(f)} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: brandInk(f), width: 5 }} radius={10} />
          <Caption font="Inter" color={MUTE} />
        </Face>
      );
    },
  },

  // C — Зөвхөн бичвэр: асар том нэр зүүн тийш, жижиг лого, брэндийн өнгөний зузаан доогуур зураас
  C: {
    label: "Зөвхөн бичвэр",
    render: (f) => {
      const ink = brandInk(f);
      return (
        <Face bg={WHITE}>
          <Abs top={60} left={90} width={420} height={180} align="flex-start">
            <Logo f={f} maxW={380} maxH={180} area={380 * 180 * 0.45} tile={logoTile(f, WHITE, INK)} pad={logoTile(f, WHITE, INK) ? 14 : 0} radius={10} />
          </Abs>
          <Abs top={256} left={90} width={1020} height={340} align="flex-start">
            <Name
              text={f.name}
              font="Inter"
              weight={800}
              size={fitSize(f.name, { max: 168, min: 48, width: 1020, em: 0.7, height: 340 })}
              color={INK}
              width={1020}
              align="left"
            />
          </Abs>
          <Rect top={612} left={90} width={240} height={18} color={ink} />
          <CtaRow f={f} font="Inter" weight={800} size={48} color={ink} iconColor={ink} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: INK, width: 6 }} />
          <Caption font="Inter" color={INK} />
        </Face>
      );
    },
  },
};
