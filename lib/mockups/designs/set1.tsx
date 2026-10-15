import { textOn } from "../color";
import {
  Abs, brandOr, Caption, CtaBlock, Face, FACE_W, fitSize, GOLD, HEAD_SIZE, hex, INK, IVORY, LIGHT_GOLD, Logo, LogoChip,
  logoTile, mix, MUTE, Name, NIGHT, PlatformIcon, QrPlate, Rect, RULE, STONE, WHITE, type Design, type DesignKey,
} from "./common";

// Багц 1 (design_set 1, 4, 7, …) — v1 (батлагдсан)
//
// Өргөн лого (4:1) A, C дээр стендийн өргөний ~70% хүртэл (840px = 84 мм), өндөр нь хязгаартай.
// Дөрвөлжин/босоо лого өндрөөрөө хязгаарлагдана — хэт том болохгүй.
const WIDE_W = Math.round(FACE_W * 0.7);

export const SET_1: Record<DesignKey, Design> = {
  // A — Минимал: цагаан, том лого дунд-дээд, нэр доор нь, нимгэн зураас, доод хагаст QR, дээр нь уриалга
  A: {
    label: "Минимал",
    render: (f) => {
      const tile = logoTile(f, WHITE, INK);
      return (
        <Face bg={WHITE}>
          <Abs top={50} height={310}>
            <Logo f={f} maxW={WIDE_W} maxH={290} area={WIDE_W * (WIDE_W / 4)} tile={tile} pad={tile ? 30 : 0} />
          </Abs>
          <Abs top={376} height={170}>
            <Name text={f.name} font="Manrope" weight={800} size={fitSize(f.name, { max: 84, min: 40, width: 1000, em: 0.66, height: 170 })} color={INK} width={1000} />
          </Abs>
          <Rect top={576} left={520} width={160} height={3} color={INK} />
          <CtaBlock f={f} font="Manrope" weight={700} color={INK} iconColor={INK} iconOn={WHITE} />
          <QrPlate f={f} bg={WHITE} border={{ color: RULE, width: 2 }} radius={24} />
          <Caption font="Manrope" color={MUTE} />
        </Face>
      );
    },
  },

  // B — Уриалга эхэнд: брэндийн өнгө, дээд хагаст маш том "ДАГААРАЙ" + том дүрс,
  // лого цагаан чип дотор жижиг нэртэй, доод хагаст цагаан карт дотор QR
  B: {
    label: "Уриалга эхэнд",
    render: (f) => {
      const bg = brandOr(f, STONE);
      const fg = textOn(bg);
      return (
        <Face bg={bg}>
          <Abs top={36} height={170}>
            <LogoChip f={f} size={164} />
          </Abs>
          {/* Нэр лого чипийн доор — том үсэг ≥5 мм (фонт ≥70px), 2 мөр хүртэл */}
          <Abs top={222} height={172}>
            <Name text={f.name} font="Manrope" weight={800} size={fitSize(f.name, { max: 80, min: 56, width: 1060, em: 0.64, height: 172 })} color={fg} width={1060} />
          </Abs>
          <Abs top={410} height={64}>
            <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 700, fontSize: HEAD_SIZE + 6, color: hex(fg), letterSpacing: 0.5 }}>Утсаа энд хүргээд</div>
          </Abs>
          <Abs top={484} height={176} dir="row" gap={30}>
            <PlatformIcon f={f} color={fg} on={bg} size={150} />
            <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 136, lineHeight: 1, letterSpacing: -4, color: hex(fg), whiteSpace: "nowrap" }}>ДАГААРАЙ</div>
          </Abs>
          {/* Цагаан карт: QR + доод бичвэр */}
          <Abs top={PLATE_CARD_TOP} left={260} width={680} height={1372 - PLATE_CARD_TOP} style={{ background: hex(WHITE), borderRadius: 44 }} />
          <QrPlate f={f} bg={WHITE} />
          <Caption font="Manrope" color={MUTE} weight={600} />
        </Face>
      );
    },
  },

  // C — Премиум хар: хар, нимгэн алтлаг давхар хүрээ, serif, сунгасан үсгийн зайтай том нэр,
  // жижиг лого, QR алтлаг хүрээтэй квадрат дотор, уриалга italic
  C: {
    label: "Премиум хар",
    render: (f) => {
      const tile = logoTile(f, NIGHT, IVORY);
      return (
        <Face bg={NIGHT}>
          <Rect top={32} left={32} width={1136} height={1336} color={NIGHT} style={{ border: `2px solid ${hex(GOLD)}` }} />
          <Rect top={46} left={46} width={1108} height={1308} color={NIGHT} style={{ border: `1px solid ${hex(mix(GOLD, NIGHT, 0.35))}` }} />
          <Abs top={80} height={210}>
            <Logo f={f} maxW={WIDE_W} maxH={200} area={WIDE_W * (WIDE_W / 4)} tile={tile} pad={tile ? 22 : 0} radius={4} />
          </Abs>
          <Rect top={312} left={560} width={80} height={2} color={GOLD} />
          <Abs top={330} height={190}>
            <Name
              text={f.name}
              font="Playfair"
              weight={400}
              size={fitSize(f.name, { max: 80, min: 38, width: 980, em: 0.6, tracking: 0.14, height: 180 })}
              color={IVORY}
              width={980}
              tracking={0.14}
            />
          </Abs>
          <Rect top={548} left={560} width={80} height={2} color={GOLD} />
          {/* Уриалга italic цайвар алтаар — хар дээр контраст ≥7:1 */}
          <CtaBlock f={f} font="Playfair" weight={400} italic size={72} color={LIGHT_GOLD} iconColor={GOLD} iconOn={NIGHT} />
          <QrPlate f={f} bg={IVORY} border={{ color: GOLD, width: 5 }} />
          <Caption font="Playfair" color={GOLD} italic weight={400} />
        </Face>
      );
    },
  },
};

const PLATE_CARD_TOP = 742;
