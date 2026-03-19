"use client";

import { useEffect, useRef, useState } from "react";

export default function LandingVision() {
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
      id="vision"
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
              01 Visión
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] mb-8 leading-tight max-w-4xl">
            Ser referente global de agroexportación ágil y sostenible.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
            Llevar productos frescos premium desde los Andes del Perú a los mercados más exigentes del mundo. Nuestra visión es demostrar que tamaño no define eficiencia, sino que la precisión operativa y la integridad del producto superan cualquier escala.
          </p>
        </div>
      </div>
    </section>
  );
}
