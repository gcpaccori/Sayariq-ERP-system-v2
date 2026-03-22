"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f9faf9] to-white px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-32 min-h-[100svh] lg:min-h-screen flex items-start lg:items-center">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Texto */}
        <div className="order-1 lg:order-1">
          <p className="mb-4 hidden text-sm font-semibold uppercase tracking-widest text-[#00C853] sm:block">
            Agroexportación de Precisión
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#0d2d22] leading-tight mb-6">
            Fresco del Origen Peruano.
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-xl">
            Exportamos 10 toneladas semanales de jengibre y cúrcuma 100% fresco desde Pichanaki. Cero congelados. Precisión lean. Origen garantizado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="inline-block bg-[#0d2d22] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#00C853] hover:text-[#0d2d22] transition-all text-center"
            >
              Acceder Portal B2B
            </Link>
            <a
              href="#productos"
              className="inline-block border-2 border-[#0d2d22] text-[#0d2d22] px-8 py-3 rounded-lg font-semibold hover:bg-[#0d2d22] hover:text-white transition-all text-center"
            >
              Conocer Productos
            </a>
          </div>
        </div>

        {/* Imagen */}
        <div className="order-2 relative h-[320px] sm:h-[500px] lg:order-2 lg:h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00C853]/10 to-transparent rounded-3xl" />
          <Image
            src="/company-images/foto-principal.png"
            alt="Foto principal de Sayariq"
            fill
            className="rounded-3xl object-cover object-[50%_56%] shadow-2xl transition-shadow hover:shadow-3xl sm:object-center"
            priority
            quality={92}
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
