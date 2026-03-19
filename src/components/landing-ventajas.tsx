"use client";

import { useEffect, useRef, useState } from "react";

const advantages = [
  {
    icon: "❄️",
    title: "Fresco del Origen",
    description:
      "Cosecha-a-empaque en menos de 12 horas. Cero congelados, cero compromisos.",
  },
  {
    icon: "⚡",
    title: "Operación Lean",
    description:
      "Equipo especializado, respuesta 2.4x más rápida que la competencia. Precisión sin burocracia.",
  },
  {
    icon: "🌿",
    title: "Origen Garantizado",
    description:
      "Pichanaki, Junín, Perú. Terroir legendario. Certificaciones de calidad e integridad total.",
  },
];

export default function LandingVentajas() {
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
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Por Qué Sayariq
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] mb-6">
            Ventajas que importan.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tres pilares que diferencian nuestra operación en los mercados más exigentes del mundo.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {advantages.map((adv, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-2xl bg-gradient-to-br from-[#f9faf9] to-white border border-gray-200 hover:border-[#00C853] hover:shadow-lg transition-all duration-300 transform ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="text-5xl mb-4">{adv.icon}</div>
              <h3 className="text-2xl font-bold text-[#0d2d22] mb-3">
                {adv.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {adv.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
