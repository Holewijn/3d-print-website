import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";
import { CartProvider } from "../lib/cart";
import { getPage } from "../lib/getPage";

export async function generateMetadata() {
  const page = await getPage("home");
  return { title: page?.seoTitle || "3D Print Studio", description: page?.seoDesc || "Custom 3D printing services" };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          {children}
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
