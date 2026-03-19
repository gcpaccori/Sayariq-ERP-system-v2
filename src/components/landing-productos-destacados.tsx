"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const productosDestacados = [
  {
    nombre: "Jengibre Fresco",
    cientifico: "Zingiber officinale",
    descripcion:
      "Rizomas de alta densidad, lavados y secados al aire en menos de 12 horas post-cosecha. Aroma penetrante, sabor fresco y vigorizante.",
    beneficios: [
      "Antinflamatorio natural",
      "Facilita digestión",
      "Alto contenido de gingerol",
      "Certificación orgánica",
    ],
    imagenes: ["/docs/jengibre%20planta.jpg", "/docs/jengibre.jpg"],
  },
  {
    nombre: "Cúrcuma Premium",
    cientifico: "Curcuma longa",
    descripcion:
      "Cosecha vibrante con alta concentración de curcumina natural. Directo de nuestras tierras fértiles a los mercados más exigentes de Norteamérica y Europa.",
    beneficios: [
      "Curcumina 5.4%+",
      "Antioxidante potente",
      "Propiedades antiinflamatorias",
      "100% orgánica certificada",
    ],
    imagenes: ["/docs/curcuma%20planta.jpg", "/docs/curcuma.jpg"],
  },
];

export default function LandingProductosDestacados() {
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
    <section ref={ref} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f9faf9] to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Nuestros Productos
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] mb-6">
            Dos Raíces. Una Promesa: Fresco.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Cada producto muestra nuestro compromiso con la calidad, la integridad y la excelencia desde la cosecha hasta la exportación.
          </p>
        </div>

        {/* Productos */}
        <div className="space-y-20">
          {productosDestacados.map((producto, pidx) => (
            <div
              key={pidx}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transform transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${pidx * 200}ms` }}
            >
              {/* Imágenes lado a lado - Responsivo */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                  pidx % 2 === 1 ? "lg:order-2" : ""
                }`}
              >
                {producto.imagenes.map((img, iidx) => (
                  <div
                    key={iidx}
                    className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
                  >
                    <div className="relative w-full h-64 sm:h-72 lg:h-80 bg-gray-100">
                      <Image
                        src={img}
                        alt={`${producto.nombre} - Imagen ${iidx + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Texto/Info */}
              <div className={pidx % 2 === 1 ? "lg:order-1" : ""}>
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="text-4xl font-bold text-[#00C853]">
                    {String(pidx + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="text-4xl sm:text-5xl font-bold text-[#0d2d22] mb-2">
                  {producto.nombre}
                </h3>
                <p className="text-sm font-semibold text-[#00C853] uppercase tracking-widest mb-6">
                  {producto.cientifico}
                </p>

                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  {producto.descripcion}
                </p>

                {/* Beneficios */}
                <div className="space-y-3 mb-8">
                  <p className="text-sm font-semibold text-gray-900 uppercase tracking-widest">
                    Beneficios Clave
                  </p>
                  <ul className="space-y-2">
                    {producto.beneficios.map((beneficio, bidx) => (
                      <li
                        key={bidx}
                        className="flex items-center gap-3 text-gray-700"
                      >
                        <span className="w-2 h-2 bg-[#00C853] rounded-full" />
                        {beneficio}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-[#00C853]/10 to-transparent rounded-lg border border-[#00C853]/20">
                  <div>
                    <p className="text-2xl font-bold text-[#00C853]">10T</p>
                    <p className="text-xs text-gray-600">Semanles</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#00C853]">100%</p>
                    <p className="text-xs text-gray-600">Fresco</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
