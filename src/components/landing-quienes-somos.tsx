"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const pillars = [
  {
    number: "01",
    title: "Ubicación Estratégica",
    description:
      "A menos de 1 km de las empresas exportadoras más grandes del país, en Pichanaki, Junín. Mismo terroir, mejor agilidad.",
  },
  {
    number: "02",
    title: "Operación Lean",
    description:
      "Equipo especializado, cero burocracia. Procesamiento 2.4x más rápido que la competencia masiva.",
  },
  {
    number: "03",
    title: "Integridad del Producto",
    description:
      "100% fresco, cero congelados. Cada raíz preserva su valor nutricional y características organolépticas.",
  },
];

export default function LandingQuienesSomos() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`transform transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Quiénes Somos
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] mb-16 leading-tight">
            Precisión en cada paso.
          </h2>

          {/* Pilares */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-gradient-to-br from-[#f9faf9] to-white border border-gray-200 hover:border-[#00C853] hover:shadow-lg transition-all duration-300"
              >
                <div className="text-4xl font-bold text-[#00C853] mb-4">
                  {pillar.number}
                </div>
                <h3 className="text-2xl font-bold text-[#0d2d22] mb-3">
                  {pillar.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          {/* Imagen de equipo sin recorte: mantiene proporción original */}
          <div className="rounded-3xl border border-gray-200 bg-[#f9faf9] p-3 shadow-2xl sm:p-4">
            <Image
              src="/docs/persnal.jpg"
              alt="Equipo Sayariq"
              width={1200}
              height={1200}
              className="h-auto w-full rounded-2xl object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
