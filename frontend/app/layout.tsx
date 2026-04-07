import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getPage } from "../lib/getPage";

export async function generateMetadata() {
  const page = await getPage("home");
  return { title: page?.seoTitle || "3D Print Studio", description: page?.seoDesc || "Custom 3D printing services" };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
