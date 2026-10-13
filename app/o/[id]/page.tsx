import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { RetryButton, StatusPoller } from "@/components/order/StatusPoller";
import { SummaryRow } from "@/components/order/ui";
import { alert } from "@/lib/alert";
import { CONTACT, SHOW_PRICES } from "@/lib/config";
import { db, isUuid } from "@/lib/db";
import { itemsText, markPaid } from "@/lib/fulfil";
import { displayLink } from "@/lib/links";
import { fmt } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Захиалга — TAPLY", robots: { index: false, follow: false } };

const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let order = await db.getOrder(id);
  if (!order) notFound();

  // Нээгдэх бүрт Wire-аас шалгана (webhook хоцорсон үед)
  let processing = false;
  if (order.status === "pending_payment" || order.status === "expired") {
    try {
      await markPaid(order.id);
      order = (await db.getOrder(id)) ?? order;
    } catch (e) {
      await alert("Төлөв шалгах", order.code, e);
    }
    processing = (await db.listPayments(order.id)).some((p) => p.status === "processing");
  }

  const paid = order.status === "paid" || order.status === "in_production" || order.status === "delivered";
  const phones = CONTACT.phones;

  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav showPrices={SHOW_PRICES} home={false} />
      <StatusPoller orderId={order.id} status={order.status} />
      <div className="mx-auto max-w-[1360px] px-6 pt-[96px] md:px-12">
        <p className={`${eyebrow} mb-6 text-mute`}>Захиалга {order.code}</p>

        {paid && (
          <>
            <h1 className="m-0 text-[clamp(48px,8vw,112px)] font-extrabold leading-[.95] tracking-[-.045em]">Төлөгдлөө ✓</h1>
            <p className="mb-0 mt-10 max-w-[560px] text-xl leading-[1.55] text-[#2a2a2a]">
              Баярлалаа! Бид удахгүй тантай холбогдож хүргэх цагаа тохирно.
              {order.email ? " Баримтыг имэйлээр илгээлээ." : ""}
            </p>
          </>
        )}

        {order.status === "pending_payment" && (
          <>
            <h1 className="m-0 text-[clamp(44px,7vw,96px)] font-extrabold leading-[.98] tracking-[-.045em]">
              {processing ? "Төлбөр шалгагдаж байна." : "Төлбөр хүлээгдэж байна."}
            </h1>
            <p className="mb-10 mt-10 max-w-[560px] text-lg leading-[1.6] text-[#2a2a2a]">
              {processing
                ? "Банк таны төлбөрийг боловсруулж байна. Энэ хуудас автоматаар шинэчлэгдэнэ."
                : "Төлсөн бол энэ хуудас хэдхэн секундэд шинэчлэгдэнэ. Төлөөгүй эсвэл хугацаа дууссан бол дахин төлнө үү."}
            </p>
            {!processing && <RetryButton orderId={order.id} />}
          </>
        )}

        {order.status === "expired" && (
          <>
            <h1 className="m-0 text-[clamp(44px,7vw,96px)] font-extrabold leading-[.98] tracking-[-.045em]">Хугацаа дууссан.</h1>
            <p className="mb-10 mt-10 max-w-[560px] text-lg leading-[1.6] text-[#2a2a2a]">
              Энэ захиалгын төлбөр хийгдээгүй тул хугацаа нь дууслаа. Дахин төлж болно.
            </p>
            <RetryButton orderId={order.id} />
          </>
        )}

        {order.status === "canceled" && (
          <>
            <h1 className="m-0 text-[clamp(44px,7vw,96px)] font-extrabold leading-[.98] tracking-[-.045em]">Цуцлагдсан.</h1>
            <p className="mb-10 mt-10 max-w-[560px] text-lg leading-[1.6] text-[#2a2a2a]">
              Энэ захиалга цуцлагдсан байна.{" "}
              <Link href="/order" className="font-bold underline underline-offset-4">Шинээр захиалах</Link>
            </p>
          </>
        )}

        <div className="mt-[96px] max-w-[640px] border-b border-line">
          <SummaryRow k="Бараа" v={itemsText(order)} />
          {order.fb_url && <SummaryRow k="Facebook" v={displayLink(order.fb_url)} />}
          {order.ig_url && <SummaryRow k="Instagram" v={displayLink(order.ig_url)} />}
          <SummaryRow k="Хүргэлт" v={order.delivery_fee === 0 ? "Үнэгүй" : `${fmt(order.delivery_fee)}₮`} />
          <SummaryRow k="Хаяг" v={<span className="font-medium">{order.district}, {order.address}</span>} />
          <SummaryRow k="Нийт" v={`${fmt(order.total)}₮`} strong />
        </div>

        <p className="mb-0 mt-12 text-base text-body">
          Асуух зүйл байвал:{" "}
          {phones.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " · "}
              <a href={p.href} className="inline-flex min-h-11 items-center font-bold text-ink hover:opacity-55">{p.label}</a>
            </span>
          ))}
          {" "}· захиалгын код <strong className="text-ink">{order.code}</strong>
        </p>
      </div>
      <Footer />
    </main>
  );
}
