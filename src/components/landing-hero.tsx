"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#f9faf9] to-white">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold text-[#00C853] uppercase tracking-widest mb-4">
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
        <div className="order-1 lg:order-2 relative h-96 sm:h-[500px] lg:h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00C853]/10 to-transparent rounded-3xl" />
          <Image
            src="/company-images/foto-principal.png"
            alt="Foto principal de Sayariq"
            fill
            className="object-cover rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow"
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
