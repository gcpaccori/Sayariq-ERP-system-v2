"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f9faf9] to-white px-4 pb-12 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-32 min-h-[100svh] lg:min-h-screen flex items-center">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Texto */}
        <div className="order-2 lg:order-1">
          <p className="mb-4 hidden text-sm font-semibold uppercase tracking-widest text-[#00C853] sm:block">
            Agroexportación de Precisión
          </p>
          <h1 className="mb-2 text-5xl font-bold leading-tight text-[#0d2d22] sm:mb-6 sm:text-6xl lg:text-7xl">
            Fresco del Origen Peruano.
          </h1>
          <p className="mb-8 hidden max-w-xl text-lg leading-relaxed text-gray-600 sm:block">
            Productos agrícolas premium seleccionados directamente del campo peruano. Frescura, calidad y sostenibilidad garantizadas en cada envío.
          </p>
          <div className="hidden flex-col gap-4 sm:flex sm:flex-row">
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
        <div className="order-1 relative h-[250px] sm:h-[500px] lg:order-2 lg:h-[600px]">
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
