import { CartBar } from "@/components/cart/CartBar";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { TransitionProvider } from "@/components/PageTransition";
import { Clients, Hero, How, Offer, PriceInfo, Products } from "@/components/Sections";
import { SHOW_PRICES, TRANSITION_ORIGIN } from "@/lib/config";

export default function Home() {
  return (
    <TransitionProvider origin={TRANSITION_ORIGIN}>
      <CartProvider>
        <main className="w-full overflow-x-clip bg-white text-ink">
          <Nav />
          <Hero />
          <How />
          <Offer />
          <Products />
          <Clients />
          {SHOW_PRICES && <PriceInfo />}
          <Footer />
          <CartBar />
        </main>
      </CartProvider>
    </TransitionProvider>
  );
}
