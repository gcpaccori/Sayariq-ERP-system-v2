import LandingNavbar from "@/components/landing-navbar";
import LandingHero from "@/components/landing-hero";
import LandingVision from "@/components/landing-vision";
import LandingMision from "@/components/landing-mision";
import LandingQuienesSomos from "@/components/landing-quienes-somos";
import LandingGaleriaCompleta from "@/components/landing-galeria-completa";
import LandingProductosDestacados from "@/components/landing-productos-destacados";
import LandingVentajas from "@/components/landing-ventajas";
import LandingContactoForm from "@/components/landing-contacto-form";
import LandingFooter from "@/components/landing-footer";

export const metadata = {
  title: "SAYARIQ | Agroexportación Premium de Productos Frescos",
  description:
    "Exportamos 10 toneladas semanales de jengibre y cúrcuma 100% fresco desde Pichanaki, Perú. Operación ágil, integridad del producto, origen garantizado.",
  openGraph: {
    title: "SAYARIQ | Agroexportación Premium",
    description: "Fresco del Origen Peruano. 10 toneladas semanales.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingVision />
        <LandingMision />
        <LandingQuienesSomos />
        <LandingGaleriaCompleta />
        <LandingProductosDestacados />
        <LandingVentajas />
        <LandingContactoForm />
      </main>
      <LandingFooter />
    </div>
  );
}
