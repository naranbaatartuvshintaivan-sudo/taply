import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { TransitionProvider } from "@/components/PageTransition";
import { City, Hero, How, Offer, Order, Price } from "@/components/Sections";
import { SHOW_PRICES, TRANSITION_ORIGIN } from "@/lib/config";

export default function Home() {
  return (
    <TransitionProvider origin={TRANSITION_ORIGIN}>
      <main className="w-full overflow-x-clip bg-white text-ink">
        <Nav showPrices={SHOW_PRICES} />
        <Hero />
        <How />
        <City />
        <Offer />
        {SHOW_PRICES && <Price />}
        <Order />
        <Footer />
      </main>
    </TransitionProvider>
  );
}
