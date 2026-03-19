"use client";

import { useEffect, useRef, useState } from "react";

export default function LandingMision() {
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
      id="mision"
      ref={ref}
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0d2d22] to-[#0a1f1a] text-white"
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
              02 Misión
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight max-w-4xl">
            Exportar con integridad. Siempre fresco.
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
            Exportamos 10 toneladas semanales de jengibre y cúrcuma 100% fresco, sin congelados. Nuestra misión es simple: precisión operativa, transparencia total y el producto que lo merece. Cada raíz que sale de Sayariq conserva su valor nutricional y poder organoléptico, porque sabemos que nuestros clientes exigen calidad inquebrantable.
          </p>
        </div>
      </div>
    </section>
  );
}
